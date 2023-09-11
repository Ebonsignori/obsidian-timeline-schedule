import { Plugin } from "obsidian";
import {
	TimelineScheduleSettings as TimelineScheduleSettings,
	DEFAULT_SETTINGS,
	SettingsTab,
} from "./settings/settings";
import { codeblockAutofillPlugin } from "./codeblock-autofill";
import { PrettyPreview } from "./pretty-preview";

export default class TimelineSchedule extends Plugin {
	settings: TimelineScheduleSettings;
	activeExtension: any;
	reloadingPlugins = false;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new SettingsTab(this.app, this));

		if (this.settings.enablePrettyPreview) {
			try {
				this.registerMarkdownCodeBlockProcessor(
					this.settings.blockVariableName,
					(source, el, ctx) => {
						if (source.trim()) {
							ctx.addChild(
								new PrettyPreview(el, source, this.settings)
							);
						}
					}
				);
			} catch (error) {
				/* empty */
			}
		}

		if (this.settings.enableCodeblockTextAutofill) {
			this.activeExtension = [codeblockAutofillPlugin(this.app, this.settings)];
			this.registerEditorExtension(this.activeExtension);
			this.registerEvent(
				this.app.workspace.on(
					"active-leaf-change",
					this.updateEditorProcessors.bind(this)
				)
			);
		}
	}

	// Since we can disable/enable modes that register and unregister extensions/processors in settings
	// We need to reload the plugin to unregister existing extensions/processors when settings are changed
	async reloadPlugin() {
		if (this.reloadingPlugins) return;
		this.reloadingPlugins = true;

		const plugins = (<any>this.app).plugins;
		if (!plugins?.enabledPlugins?.has(this.manifest.id)) return;
		await plugins.disablePlugin(this.manifest.id);
		try {
			await plugins.enablePlugin(this.manifest.id);
		} catch (error) {
			/* empty */
		}

		this.reloadingPlugins = false;
	}

	// Replaces the current active editor extension with an updated one
	// Useful for updating extension args when we change view contexts and/or settings
	updateEditorProcessors() {
		if (this.activeExtension?.length) {
			this.activeExtension.length = 0;
			this.activeExtension.push(codeblockAutofillPlugin(this.app, this.settings));
			this.app.workspace.updateOptions();
		}
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);

		// Override any settings that are undefined, null, or empty string with defaults
		const settings = <any>this.settings;
		for (const key in this.settings) {
			if (
				settings[key] === undefined ||
				settings[key] === null ||
				settings[key] === ""
			) {
				// Special case, we fallback to startDateFormat if parseStartDateFormat is empty
				if (key == "parseStartDateFormat" && !settings[key]) {
					(<any>this.settings)[key] = this.settings.startDateFormat;
				} else {
					(<any>this.settings)[key] = (<any>DEFAULT_SETTINGS)[key];
				}
			}
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
