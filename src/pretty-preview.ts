import { MarkdownRenderChild, moment } from "obsidian";
import { TimelineScheduleSettings } from "./settings/settings";
import timestring from "timestring";
import {
	matchBlockRegex,
	matchHumanTimeRegex,
	getAcceptableStartDateRegex,
	getStartDateFromUserString,
	getEndDateBlockRegex,
} from "./utils";

// Markdown processor responsible for rendering a pretty preview of the schedule
// When cursor leaves the code block
export class PrettyPreview extends MarkdownRenderChild {
	body: string;
	settings: TimelineScheduleSettings;

	constructor(
		containerEl: HTMLElement,
		body: string,
		settings: TimelineScheduleSettings
	) {
		super(containerEl);

		this.body = body;
		this.settings = settings;
	}

	onload() {
		return this.addVirtualTimeBlocks();
	}

	// If no time blocks are in the text, add them to a body string
	addVirtualTimeBlocks() {
		const lines = this.body.trim().split("\n");
		const newLines = [];

		const startRegex = getAcceptableStartDateRegex(this.settings);
		const endRegex = getEndDateBlockRegex(this.settings);

		let hasStartLine = false;
		let startDate;
		let elapsedMs = 0;
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			if (!hasStartLine) {
				hasStartLine = true;
				const [, startBlock, startTime] =
					[...line.matchAll(startRegex)]?.[0] || [];

				if (startBlock) {
					if (startTime) {
						startDate = getStartDateFromUserString(
							startTime.trim(),
							this.settings
						);
					} else {
						startDate = moment();
					}
					newLines.push(
						`[${this.settings.startBlockName}]: ${startDate.format(
							this.settings.startDateFormat
						)}`
					);
					if (lines.length > 1) {
						continue;
					}
				} else {
					startDate = moment();
					newLines.push(
						`[${this.settings.startBlockName}]: ${startDate.format(
							this.settings.startDateFormat
						)}`
					);
				}
			}

			if (!startDate) {
				startDate = moment();
			}

			const nextDate = moment(startDate).add(elapsedMs, "millisecond");

			const humanTime = line.match(matchHumanTimeRegex);

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

			const timeBlockString = `[${nextDate.format(
				this.settings.eventDateFormat
			)}]:`;

			const [, block, contents] =
				[...line.matchAll(matchBlockRegex)]?.[0] || [];

			// If time block already exists in text, replace it
			if ((block && contents.trim() === "") || line.match(endRegex)) {
				// Do not add a line if empty block or an [end] block
			} else if (block) {
				newLines.push(`${timeBlockString} ${contents}`);
			} else {
				newLines.push(`${timeBlockString} ${line}`);
			}

			// End block
			if (i === lines.length - 1) {
				const endDate = moment(startDate).add(elapsedMs, "millisecond");
				const endBlock = `[${
					this.settings.endBlockName
				}]: ${endDate.format(this.settings.endDateFormat)}`;
				newLines.push(endBlock);
			}
		}

		return this.renderPreviewFromTimeBlocks(newLines);
	}

	// Render the preview as if the time blocks are already in the text
	renderPreviewFromTimeBlocks(lines: string[]) {
		const listEl = this.containerEl.createEl("ul", {
			cls: "timeline-schedule-list",
		});

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const [, block, contents] =
				[...line.matchAll(matchBlockRegex)]?.[0] || [];

			if (block && contents.trim()) {
				let listItemClassName = "timeline-schedule-list-item";
				if (i === 0) {
					listItemClassName += " timeline-schedule-start";
				} else if (i === lines.length - 1) {
					listItemClassName += " timeline-schedule-end";
				}

				const listItem = this.containerEl.createEl("li", {
					cls: listItemClassName,
				});

				listItem.appendChild(
					this.containerEl.createEl("span", {
						cls: "timeline-schedule-list-item-block",
						text: block
							.replace(/[[\]]/gi, "")
							.trim()
							.replace(/:$/, ""),
					})
				);
				listItem.appendChild(
					this.containerEl.createEl("span", {
						cls: "timeline-schedule-list-item-contents",
						text: contents,
					})
				);
				listEl.appendChild(listItem);
			}
		}
		this.containerEl.appendChild(listEl);
	}
}
