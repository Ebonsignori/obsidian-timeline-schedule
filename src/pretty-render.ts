import { MarkdownRenderChild } from "obsidian";
import { matchBlockRegex } from "./constants";

export class PrettyRender extends MarkdownRenderChild {
	body: string;

	constructor(containerEl: HTMLElement, body: string) {
		super(containerEl);

		this.body = body;
	}

	onload() {
		const lines = this.body.trim().split("\n");
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
