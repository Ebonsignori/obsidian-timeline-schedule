import { App, PluginSettingTab, Setting, moment } from "obsidian";
import TimelineSchedule from "src/main";

export interface TimelineScheduleSettings {
	blockVariableName: string;

	enableCodeblockTextCompletion: boolean;
	shouldAppendEmptyTimeBlock: boolean;

	startDateFormat: string;
	endDateFormat: string;
	eventDateFormat: string;
}

export const DEFAULT_SETTINGS: TimelineScheduleSettings = {
	blockVariableName: "schedule",

	enableCodeblockTextCompletion: true,
	shouldAppendEmptyTimeBlock: false,

	startDateFormat: "h:mm A",
	endDateFormat: "h:mm A",
	eventDateFormat: "h:mm A",
};

export class SettingsTab extends PluginSettingTab {
	plugin: TimelineSchedule;

	constructor(app: App, plugin: TimelineSchedule) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		this.containerEl.empty();

		this.containerEl.appendChild(
			createHeading(this.containerEl, "Timeline Schedule settings")
		);

		new Setting(this.containerEl)
			.setName("Code block variable")
			.setDesc(
				"The name of the code block variable to use for the schedule"
			)
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.blockVariableName)
					.setValue(this.plugin.settings.blockVariableName)
					.onChange(async (value: string) => {
						this.plugin.settings.blockVariableName = value;
						await this.plugin.saveSettings();
						this.display();
					})
			);

		new Setting(this.containerEl).setName("Code block completion");

		new Setting(this.containerEl)
			.setName("Enable code block text completion")
			.setDesc(
				`When in a multi-line ${this.plugin.settings.blockVariableName} code block, dates will be prepended on each line.`
			)
			.addToggle((toggle) =>
				toggle
					.setValue(
						this.plugin.settings.enableCodeblockTextCompletion
					)
					.onChange(async (value: boolean) => {
						this.plugin.settings.enableCodeblockTextCompletion =
							value;
						await this.plugin.saveSettings();
						this.display();
					})
			);

		if (this.plugin.settings.enableCodeblockTextCompletion) {
			new Setting(this.containerEl)
				.setName("Append empty time block")
				.setDesc(
					`Will always append an empty event time block before the [end] time block in a ${this.plugin.settings.blockVariableName} code block.`
				)
				.addToggle((toggle) =>
					toggle
						.setValue(
							this.plugin.settings.shouldAppendEmptyTimeBlock
						)
						.onChange(async (value: boolean) => {
							this.plugin.settings.shouldAppendEmptyTimeBlock =
								value;
							await this.plugin.saveSettings();
							this.display();
						})
				);
		}

		new Setting(this.containerEl).setName("Date formats");

		const startDateFormatDesc = document.createDocumentFragment();
		startDateFormatDesc.append(
			`Date format of the [start] date block `,
			createLink(
				startDateFormatDesc,
				"moment.js date format",
				"https://momentjscom.readthedocs.io/en/latest/moment/04-displaying/01-format/"
			),
			`. (example: ${moment().format(
				this.plugin.settings.startDateFormat ||
					DEFAULT_SETTINGS.startDateFormat
			)})`
		);
		new Setting(this.containerEl)
			.setName("Start date format")
			.setDesc(startDateFormatDesc)
			.addText((text) => {
				text.setPlaceholder(DEFAULT_SETTINGS.startDateFormat)
					.setValue(this.plugin.settings.startDateFormat)
					.onChange(async (value: string) => {
						this.plugin.settings.startDateFormat = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.onblur = () => {
					this.display();
				};
			});

		const endDateFormatDesc = document.createDocumentFragment();
		endDateFormatDesc.append(
			`Date format of the [end] date block `,
			createLink(
				endDateFormatDesc,
				"moment.js date format",
				"https://momentjscom.readthedocs.io/en/latest/moment/04-displaying/01-format/"
			),
			`. (example: ${moment().format(
				this.plugin.settings.endDateFormat ||
					DEFAULT_SETTINGS.endDateFormat
			)})`
		);
		new Setting(this.containerEl)
			.setName("End date format")
			.setDesc(endDateFormatDesc)
			.addText((text) => {
				text.setPlaceholder(DEFAULT_SETTINGS.endDateFormat)
					.setValue(this.plugin.settings.endDateFormat)
					.onChange(async (value: string) => {
						this.plugin.settings.endDateFormat = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.onblur = () => {
					this.display();
				};
			});

		const eventDateFormatDesc = document.createDocumentFragment();
		eventDateFormatDesc.append(
			`Date format of the [event] date block `,
			createLink(
				eventDateFormatDesc,
				"moment.js date format",
				"https://momentjscom.readthedocs.io/en/latest/moment/04-displaying/01-format/"
			),
			`. (example: ${moment().format(
				this.plugin.settings.eventDateFormat ||
					DEFAULT_SETTINGS.eventDateFormat
			)})`
		);
		new Setting(this.containerEl)
			.setName("Event date format")
			.setDesc(eventDateFormatDesc)
			.addText((text) => {
				text.setPlaceholder(DEFAULT_SETTINGS.eventDateFormat)
					.setValue(this.plugin.settings.eventDateFormat)
					.onChange(async (value: string) => {
						this.plugin.settings.eventDateFormat = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.onblur = () => {
					this.display();
				};
			});
	}

	async validate() {
		return true;
	}
}

function createHeading(el: HTMLElement, text: string, level = 2) {
	const heading = el.createEl(`h${level}` as keyof HTMLElementTagNameMap, {
		text,
	});
	return heading;
}

function createLink(
	el: HTMLElement | DocumentFragment,
	text: string,
	href: string
) {
	const link = el.createEl("a", { text, href });
	return link;
}
