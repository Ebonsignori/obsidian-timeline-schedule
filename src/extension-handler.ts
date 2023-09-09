import { ViewPlugin } from "@codemirror/view";
import type { PluginValue, EditorView } from "@codemirror/view";
import { moment, type App, type EditorPosition, MarkdownView } from "obsidian";
import timestring from "timestring";
import {
	DEFAULT_SETTINGS,
	TimelineScheduleSettings,
} from "src/settings/settings";
import { matchBlockRegex, matchHumanTimeRegex } from "./constants";

class TimelineScheduleExtension implements PluginValue {
	private readonly view: EditorView;
	private app: App;
	private settings: TimelineScheduleSettings;

	private codeBlockRegex: RegExp;

	// Set from settings
	private blockVariableName: string;
	private startBlockName: string;
	private endBlockName: string;
	private shouldAppendEmptyTimeBlock: boolean;
	private startDateFormat: string;
	private endDateFormat: string;
	private eventDateFormat: string;

	constructor(view: EditorView) {
		this.view = view;
		this.handleKeyEvent = this.handleKeyEvent.bind(this);
		this.view.dom.addEventListener("keydown", this.handleKeyEvent);
	}

	public updateProps(app: App, settings: TimelineScheduleSettings): any {
		this.app = app;
		this.settings = settings;

		this.codeBlockRegex = new RegExp(
			"`{3}(" +
				this.settings.blockVariableName +
				"\\s*?)\\n([\\w\\s\\S]*?)\\n`{3}",
			"gim"
		);

		this.blockVariableName =
			this.settings.blockVariableName ||
			DEFAULT_SETTINGS.blockVariableName;
		this.startBlockName = `[${
			this.settings.startBlockName || DEFAULT_SETTINGS.startBlockName
		}]:`;
		this.endBlockName = `[${
			this.settings.endBlockName || DEFAULT_SETTINGS.endBlockName
		}]:`;
		this.shouldAppendEmptyTimeBlock =
			this.settings.shouldAppendEmptyTimeBlock ||
			DEFAULT_SETTINGS.shouldAppendEmptyTimeBlock;
		this.startDateFormat =
			this.settings.startDateFormat || DEFAULT_SETTINGS.startDateFormat;
		this.endDateFormat =
			this.settings.endDateFormat || DEFAULT_SETTINGS.endDateFormat;
		this.eventDateFormat =
			this.settings.eventDateFormat || DEFAULT_SETTINGS.eventDateFormat;
	}

	public destroy(): void {
		this.view.dom.removeEventListener("keydown", this.handleKeyEvent);
	}

	private handleKeyEvent(): boolean {
		const doc = this.view.state.doc.toString() as string;

		if (!doc) {
			return false;
		}

		const matches = [...doc.matchAll(this.codeBlockRegex)];

		// We found a match with `schedule` as code block title
		for (const match of matches) {
			if (typeof match.index === "undefined" || match.index === null) {
				continue;
			}
			if (match?.[1].trim() !== this.blockVariableName) {
				continue;
			}

			this.processMatchingCodeBlock(match);
		}

		return true;
	}

	private processMatchingCodeBlock(match: RegExpMatchArray): void {
		const innerIndex =
			<number>match.index + 4 + this.blockVariableName.length;
		let hasChanges = false;

		const innerContents = match?.[2];
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

			// 0: full string
			// 1: bracket colon part: [start]:, [end]:, [XX:YY]:
			// 2: everything after colon
			const lineMatches = [...line.matchAll(matchBlockRegex)]?.[0];
			const textBlock = lineMatches?.[1] || "";
			const textAfterColon = (<string>lineMatches?.[2] || "").trim();

			// add [start] block if first line and it's missing
			if (i === 0 && textBlock !== this.startBlockName) {
				if (textAfterColon) {
					startTime = moment(textAfterColon, this.startDateFormat);
					line = `${this.startBlockName} ${startTime.format(
						this.startDateFormat
					)}`;
				} else {
					startTime = moment();
					line = `${this.startBlockName} ${startTime.format(
						this.startDateFormat
					)}`;
				}

				// Update line
				hasChanges = true;
				splitLines[i] = line;
				continue;
			} else if (i === 0 && textBlock === this.startBlockName) {
				// Determine start time if not initialized from creating a [start] block
				if (textAfterColon) {
					startTime = moment(textAfterColon, this.startDateFormat);
				}
				continue;
			}

			// Replace all [time] blocks or empty lines with the correct time
			if (!textBlock || textBlock !== this.endBlockName) {
				// If empty line and we have appendEmptyTimeBlock enabled, delete the empty line
				if (
					!textBlock &&
					this.shouldAppendEmptyTimeBlock &&
					i < splitLines.length - 1
				) {
					const nextLineMatches = [
						...splitLines[i + 1].matchAll(matchBlockRegex),
					]?.[0];
					if (nextLineMatches?.[2].trim() === "") {
						// Update line
						hasChanges = true;
						splitLines.splice(i, 1);
						i--;
						continue;
					}
				}

				let nextDate = moment(startTime);
				if (elapsedMs) {
					nextDate = nextDate.add(elapsedMs, "millisecond");
				}
				const timeBlockString = `[${nextDate.format(
					this.eventDateFormat
				)}]:`;
				if (textBlock !== timeBlockString) {
					line = `${timeBlockString} ${textAfterColon}`;
					// Update line
					hasChanges = true;
					splitLines[i] = line;
				}
			}

			// Use [time] blocks to calculate elapsed time
			if (textBlock !== this.endBlockName) {
				// Existing time block
				const humanTime = textAfterColon.match(matchHumanTimeRegex);
				if (humanTime) {
					try {
						const ms = timestring(humanTime?.[0] || "", "ms");
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
				const endBlockString = `${this.endBlockName} ${endDate.format(
					this.endDateFormat
				)}`;
				if (line.trim() !== endBlockString) {
					// Update line
					hasChanges = true;
					splitLines[i] = endBlockString;
				}
			}
		}

		// Option to always append an empty time block
		if (this.shouldAppendEmptyTimeBlock) {
			const beforeLastLineMatch = [
				...splitLines[splitLines.length - 2].matchAll(matchBlockRegex),
			]?.[0];
			if (!beforeLastLineMatch || beforeLastLineMatch?.[2].trim()) {
				let nextDate = moment(startTime);
				if (elapsedMs) {
					nextDate = nextDate.add(elapsedMs, "millisecond");
				}
				// Update line
				hasChanges = true;
				const line = `[${nextDate.format(this.eventDateFormat)}]: `;
				splitLines.splice(splitLines.length - 1, 0, line);
			}
		}

		// Update inner contents, but preserve cursor and scroll position
		if (hasChanges) {
			const newContents = splitLines.join("\n");
			const activeView =
				this.app?.workspace?.getActiveViewOfType(MarkdownView);
			const existingScroll = activeView?.currentMode?.getScroll();
			const existingCursor = this.getCursor();
			const changes = {
				from: innerIndex,
				insert: newContents,
			};
			if (innerContents.trim()) {
				// @ts-expect-error .to is added
				changes.to = innerIndex + innerContents.length;
			}
			this.view.dispatch(this.view.state.update({ changes }));
			const newCursorLine = this.view.state.doc.toString().split("\n")[
				existingCursor.line - 1
			];
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

export const editorExtension = ViewPlugin.fromClass(TimelineScheduleExtension);
