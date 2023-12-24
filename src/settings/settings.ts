import { App, PluginSettingTab, Setting, moment } from "obsidian";
import TimelineSchedule from "src/main";

export interface TimelineScheduleSettings {
	blockVariableName: string;
	startBlockName: string;
	endBlockName: string;

	enablePrettyPreview: boolean;

	enableCodeblockTextAutofill: boolean;

	startDateFormat: string;
	endDateFormat: string;
	eventDateFormat: string;
}

export const DEFAULT_SETTINGS: TimelineScheduleSettings = {
	blockVariableName: "schedule",
	startBlockName: "Start",
	endBlockName: "Finish",

	enablePrettyPreview: true,

	enableCodeblockTextAutofill: true,

	startDateFormat: "MM/DD/YY - hh:mm A",
	endDateFormat: "MM/DD/YY - hh:mm A",
	eventDateFormat: "h:mm A",
};

export class SettingsTab extends PluginSettingTab {
	plugin: TimelineSchedule;

	constructor(app: App, plugin: TimelineSchedule) {
		super(app, plugin);
		this.plugin = plugin;
	}

	// On close, reload the plugin
	hide() {
		this.plugin.updateEditorProcessors();
		this.plugin.reloadPlugin();
	}

	display(): void {
		this.containerEl.empty();

		const codeBlockVariableName = new Setting(this.containerEl)
			.setName("Code block variable")
			.setDesc(
				"The name of the code block variable to use for the plugin."
			)
			.addText((text) => {
				text.setPlaceholder(DEFAULT_SETTINGS.blockVariableName)
					.setValue(this.plugin.settings.blockVariableName)
					.onChange(async (value: string) => {
						this.plugin.settings.blockVariableName = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.onblur = () => {
					this.display();
				};
			});
		codeBlockVariableName.addExtraButton((button) => {
			button
				.setIcon("reset")
				.setTooltip("Reset to default")
				.onClick(async () => {
					this.plugin.settings.blockVariableName =
						DEFAULT_SETTINGS.blockVariableName;
					await this.plugin.saveSettings();
					this.display();
				});
		});

		const startBlockName = new Setting(this.containerEl)
			.setName("Start block name")
			.setDesc("The name of the start block.")
			.addText((text) => {
				text.setPlaceholder(DEFAULT_SETTINGS.startBlockName)
					.setValue(this.plugin.settings.startBlockName)
					.onChange(async (value: string) => {
						this.plugin.settings.startBlockName = value;
						await this.plugin.saveSettings();
					});
			});
		startBlockName.addExtraButton((button) => {
			button
				.setIcon("reset")
				.setTooltip("Reset to default")
				.onClick(async () => {
					this.plugin.settings.startBlockName =
						DEFAULT_SETTINGS.startBlockName;
					await this.plugin.saveSettings();
					this.display();
				});
		});

		const endBlockName = new Setting(this.containerEl)
			.setName("End block name")
			.setDesc("The name of the end block.")
			.addText((text) => {
				text.setPlaceholder(DEFAULT_SETTINGS.endBlockName)
					.setValue(this.plugin.settings.endBlockName)
					.onChange(async (value: string) => {
						this.plugin.settings.endBlockName = value;
						await this.plugin.saveSettings();
					});
			});
		endBlockName.addExtraButton((button) => {
			button
				.setIcon("reset")
				.setTooltip("Reset to default")
				.onClick(async () => {
					this.plugin.settings.endBlockName =
						DEFAULT_SETTINGS.endBlockName;
					await this.plugin.saveSettings();
					this.display();
				});
		});

		new Setting(this.containerEl)
			.setName("Pretty preview when cursor leaves")
			.setDesc(
				`Pretty preview ${
					this.plugin.settings.blockVariableName ||
					DEFAULT_SETTINGS.blockVariableName
				} code blocks when your cursor exits the code block`
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enablePrettyPreview)
					.onChange(async (value: boolean) => {
						this.plugin.settings.enablePrettyPreview = value;
						await this.plugin.saveSettings();
						this.display();
					})
			);

		new Setting(this.containerEl)
			.setName("Enable code block text autofill")
			.setDesc(
				`When in a multi-line ${
					this.plugin.settings.blockVariableName ||
					DEFAULT_SETTINGS.blockVariableName
				} code block, dates will be prepended on each line.`
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableCodeblockTextAutofill)
					.onChange(async (value: boolean) => {
						this.plugin.settings.enableCodeblockTextAutofill =
							value;
						await this.plugin.saveSettings();
						this.display();
					})
			);

		new Setting(this.containerEl).setName("Date formats");

		const startDateFormatDesc = document.createDocumentFragment();
		startDateFormatDesc.append(
			createLink(
				startDateFormatDesc,
				"Syntax Reference",
				"https://momentjscom.readthedocs.io/en/latest/moment/04-displaying/01-format/"
			),
			startDateFormatDesc.createEl("br"),
			`Current syntax looks like this: ${moment().format(
				this.plugin.settings.startDateFormat ||
					DEFAULT_SETTINGS.startDateFormat
			)}`
		);
		const startDateFormat = new Setting(this.containerEl)
			.setName("Start date format")
			.setDesc(startDateFormatDesc)
			.addMomentFormat((format) => {
				format
					.setDefaultFormat(DEFAULT_SETTINGS.startDateFormat)
					.setPlaceholder(DEFAULT_SETTINGS.startDateFormat)
					.setValue(this.plugin.settings.startDateFormat)
					.onChange(async (value: string) => {
						this.plugin.settings.startDateFormat = value;
						await this.plugin.saveSettings();
					});
				format.inputEl.onblur = () => {
					this.display();
				};
			});
		startDateFormat.addExtraButton((button) => {
			button
				.setIcon("reset")
				.setTooltip("Reset to default")
				.onClick(async () => {
					this.plugin.settings.startDateFormat =
						DEFAULT_SETTINGS.startDateFormat;
					await this.plugin.saveSettings();
					this.display();
				});
		});

		const endDateFormatDesc = document.createDocumentFragment();
		endDateFormatDesc.append(
			createLink(
				endDateFormatDesc,
				"Syntax Reference",
				"https://momentjscom.readthedocs.io/en/latest/moment/04-displaying/01-format/"
			),
			startDateFormatDesc.createEl("br"),
			`Current syntax looks like this: ${moment().format(
				this.plugin.settings.endDateFormat ||
					DEFAULT_SETTINGS.endDateFormat
			)}`
		);
		const endDateFormat = new Setting(this.containerEl)
			.setName("End date format")
			.setDesc(endDateFormatDesc)
			.addMomentFormat((text) => {
				text.setDefaultFormat(DEFAULT_SETTINGS.endDateFormat)
					.setPlaceholder(DEFAULT_SETTINGS.endDateFormat)
					.setValue(this.plugin.settings.endDateFormat)
					.onChange(async (value: string) => {
						this.plugin.settings.endDateFormat = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.onblur = () => {
					this.display();
				};
			});
		endDateFormat.addExtraButton((button) => {
			button
				.setIcon("reset")
				.setTooltip("Reset to default")
				.onClick(async () => {
					this.plugin.settings.endDateFormat =
						DEFAULT_SETTINGS.endDateFormat;
					await this.plugin.saveSettings();
					this.display();
				});
		});

		const eventDateFormatDesc = document.createDocumentFragment();
		eventDateFormatDesc.append(
			createLink(
				eventDateFormatDesc,
				"Syntax Reference",
				"https://momentjscom.readthedocs.io/en/latest/moment/04-displaying/01-format/"
			),
			startDateFormatDesc.createEl("br"),
			`Current syntax looks like this: ${moment().format(
				this.plugin.settings.eventDateFormat ||
					DEFAULT_SETTINGS.eventDateFormat
			)}`
		);
		const eventDateFormat = new Setting(this.containerEl)
			.setName("Event date format")
			.setDesc(eventDateFormatDesc)
			.addMomentFormat((text) => {
				text.setDefaultFormat(DEFAULT_SETTINGS.eventDateFormat)
					.setPlaceholder(DEFAULT_SETTINGS.eventDateFormat)
					.setValue(this.plugin.settings.eventDateFormat)
					.onChange(async (value: string) => {
						this.plugin.settings.eventDateFormat = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.onblur = () => {
					this.display();
				};
			});
		eventDateFormat.addExtraButton((button) => {
			button
				.setIcon("reset")
				.setTooltip("Reset to default")
				.onClick(async () => {
					this.plugin.settings.eventDateFormat =
						DEFAULT_SETTINGS.eventDateFormat;
					await this.plugin.saveSettings();
					this.display();
				});
		});
	}

	async validate() {
		return true;
	}
}

function createLink(
	el: HTMLElement | DocumentFragment,
	text: string,
	href: string
) {
	const link = el.createEl("a", { text, href });
	return link;
}
