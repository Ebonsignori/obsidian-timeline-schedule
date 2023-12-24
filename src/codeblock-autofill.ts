import { ViewPlugin } from "@codemirror/view";
import type { PluginValue, EditorView } from "@codemirror/view";
import { moment, type App, type EditorPosition, MarkdownView } from "obsidian";
import timestring from "timestring";
import { TimelineScheduleSettings } from "src/settings/settings";
import {
	getAcceptableStartDateRegex,
	getStartDateFromUserString,
	matchBlockRegex,
	matchHumanTimeRegex,
} from "./utils";

// Editor extension responsible for autofilling dates in a codeblock
export function codeblockAutofillPlugin(
	app: App,
	settings: TimelineScheduleSettings
) {
	return ViewPlugin.fromClass(
		class TimelineScheduleExtension implements PluginValue {
			private readonly view: EditorView;

			private codeBlockRegex: RegExp;
			private startBlockName: string;
			private endBlockName: string;

			constructor(view: EditorView) {
				this.view = view;
				this.handleKeyEvent = this.handleKeyEvent.bind(this);
				this.view.dom.addEventListener("keydown", this.handleKeyEvent);
				this.initInstanceVars();
			}

			initInstanceVars(): void {
				this.codeBlockRegex = new RegExp(
					"(.*)?`{3}(" +
						settings.blockVariableName +
						"\\s*?)\\n([\\w\\s\\S]*?)`{3}",
					"gim"
				);

				this.startBlockName = `[${settings.startBlockName}]:`;
				this.endBlockName = `[${settings.endBlockName}]:`;
			}

			public destroy(): void {
				this.view.dom.removeEventListener(
					"keydown",
					this.handleKeyEvent
				);
			}

			private handleKeyEvent(): boolean {
				const doc = this.view.state.doc.toString() as string;

				if (!doc) {
					return false;
				}

				const matches = [...doc.matchAll(this.codeBlockRegex)];

				// We found a match with `schedule` as code block title
				for (const match of matches) {
					const [, beforeCodeBlock, blockName] = match || [];
					if (
						typeof match.index === "undefined" ||
						match.index === null
					) {
						continue;
					}
					// Only schedule block
					if (blockName?.trim() !== settings.blockVariableName) {
						continue;
					}
					// We only autofill if whitespace or callout ">" is before the codeblock
					if (
						beforeCodeBlock?.length &&
						!beforeCodeBlock.match(/^(\s|>)*$/gi)
					) {
						continue;
					}

					this.processMatchingCodeBlock(match);
				}

				return true;
			}

			private processMatchingCodeBlock(match: RegExpMatchArray): void {
				const beforeCodeBlockContents = match?.[1] || "";
				const innerIndex =
					<number>match.index + 4 + settings.blockVariableName.length + beforeCodeBlockContents.length;
				let hasChanges = false;

				const innerContents = match?.[3];
				const splitLines = innerContents.trim().split("\n");

				// Fill in the codeblock with empty lines so we can replace them with 3 core time blocks in the for loop
				if (!splitLines.length) {
					splitLines.push("");
				}
				if (splitLines.length === 1) {
					splitLines.push("");
				}
				if (splitLines.length === 2) {
					splitLines.push("");
				}

				let startTime;
				let elapsedMs = 0;

				for (let i = 0; i < splitLines.length; i++) {
					let line = splitLines[i].trim();
					if (line.startsWith(beforeCodeBlockContents)) {
						line = line.substring(beforeCodeBlockContents.length);
					}

					// 0: full string
					// 1: bracket colon part: [start]:, [end]:, [XX:YY]:
					// 2: everything after colon
					const lineMatches = [
						...line.matchAll(matchBlockRegex),
					]?.[0];
					const textBlock = lineMatches?.[1] || "";
					let textAfterColon = (
						<string>lineMatches?.[2] || ""
					).trim();

					// add [start] block if first line and it's missing
					if (i === 0 && textBlock !== this.startBlockName) {
						const [, startBlock, afterColonMatch] =
							[
								...line.matchAll(
									getAcceptableStartDateRegex(settings)
								),
							]?.[0] || [];
						if (startBlock && afterColonMatch) {
							textAfterColon = afterColonMatch;
						}
						if (textAfterColon) {
							startTime = getStartDateFromUserString(
								textAfterColon,
								settings
							);
							line = `${this.startBlockName} ${startTime.format(
								settings.startDateFormat
							)}`;
						} else {
							startTime = moment();
							line = `${this.startBlockName} ${startTime.format(
								settings.startDateFormat
							)}`;
						}

						// Update line
						hasChanges = true;
						splitLines[i] = line;
						continue;
					} else if (i === 0 && textBlock === this.startBlockName) {
						// Determine start time if not initialized from creating a [start] block
						if (textAfterColon) {
							startTime = getStartDateFromUserString(
								textAfterColon,
								settings
							);
						}
						continue;
					}

					// Replace all [time] blocks or empty lines with the correct time
					const isEarlyFinishBlock = textBlock === this.endBlockName && i < 2;
					if (isEarlyFinishBlock) {
						textAfterColon = "";
					}
					if (
						!textBlock ||
						isEarlyFinishBlock || 
						textBlock !== this.endBlockName
					) {
						let nextDate = moment(startTime);
						if (elapsedMs) {
							nextDate = nextDate.add(elapsedMs, "millisecond");
						}
						console.log(nextDate.format(settings.eventDateFormat))
						const timeBlockString = `[${nextDate.format(
							settings.eventDateFormat
						)}]:`;
						if (textBlock !== timeBlockString) {
							if (textBlock) {
								line = `${timeBlockString} ${textAfterColon}`;
							} else {
								if (timeBlockString.startsWith(line)) {
									line = `${timeBlockString} `;
								} else {
									line = `${timeBlockString} ${line}`;
								}
							}

							// Update line
							hasChanges = true;
							splitLines[i] = line;
						}
					}

					// Use [time] blocks to calculate elapsed time
					if (textBlock !== this.endBlockName) {
						// Existing time block
						const humanTime =
							textAfterColon.match(matchHumanTimeRegex);
						if (humanTime) {
							try {
								const ms = timestring(
									humanTime?.[0] || "",
									"ms"
								);
								if (ms) {
									elapsedMs += ms;
								}
							} catch (error) {
								/* empty */
							}
						}
					}

					// Always append an [end] block
					if (i === splitLines.length - 1) {
						let endDate = moment(startTime);
						if (elapsedMs) {
							endDate = endDate.add(elapsedMs, "millisecond");
						}
						const endBlockString = `${
							this.endBlockName
						} ${endDate.format(settings.endDateFormat)}`;
						if (line.trim() !== endBlockString) {
							// Update line
							hasChanges = true;
							splitLines[i] = endBlockString;
						}
					}
				}

				// Update inner contents, but preserve cursor and scroll position
				if (hasChanges) {
					const newContents = splitLines.join("\n") + "\n";
					const activeView =
						app?.workspace?.getActiveViewOfType(MarkdownView);
					const existingScroll = activeView?.currentMode?.getScroll();
					const existingCursor = this.getCursor();
					const changes = {
						from: innerIndex,
						to: innerIndex + innerContents.length,
						insert: newContents,
					};
					this.view.dispatch(this.view.state.update({ changes }));
					const newCursorLine = this.view.state.doc
						.toString()
						.split("\n")[existingCursor.line - 1];
					let bumpCursor = 0;
					if (newCursorLine) {
						const matches = [
							...newCursorLine.matchAll(matchBlockRegex),
						]?.[0];
						if (matches?.[2].trim() === "") {
							bumpCursor = newCursorLine.length;
						}
					}
					if (existingCursor?.ch) {
						this.view.dispatch(
							this.view.state.update({
								selection: {
									anchor: existingCursor.ch + bumpCursor,
									head: existingCursor.ch + bumpCursor,
								},
							})
						);
					}
					if (existingScroll) {
						activeView?.currentMode?.applyScroll(existingScroll);
					}
				}
			}

			private getCursor(): EditorPosition {
				const ch = this.view.state.selection.ranges[0].head;
				const line = this.view.state.doc.lineAt(ch).number;
				return {
					ch,
					line,
				};
			}
		}
	);
}
