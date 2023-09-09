import { Plugin } from "obsidian";
import {
	TimelineScheduleSettings as TimelineScheduleSettings,
	DEFAULT_SETTINGS,
	SettingsTab,
} from "./settings/settings";
import { inlinePlugin } from "./extension-handler";
import { PrettyRender } from "./pretty-render";

export default class TimelineSchedule extends Plugin {
	settings: TimelineScheduleSettings;
	activeExtension: any;
	reloadingPlugins = false;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new SettingsTab(this.app, this));

		if (this.settings.renderInPreviewMode) {
			try {
				this.registerMarkdownCodeBlockProcessor(
					this.settings.blockVariableName ||
						DEFAULT_SETTINGS.blockVariableName,
					(source, el, ctx) => {
						if (source.trim()) {
							ctx.addChild(new PrettyRender(el, source));
						}
					}
				);
			} catch (error) {
				/* empty */
			}
		}

		if (this.settings.enableCodeblockTextCompletion) {
			this.activeExtension = [inlinePlugin(this.app, this.settings)];
			this.registerEditorExtension(this.activeExtension);
			this.registerEvent(
				this.app.workspace.on(
					"active-leaf-change",
					this.updateEditorProcessors.bind(this)
				)
			);
		}
	}

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

	updateEditorProcessors() {
		// Update the active extension
		// Empty the array while keeping the same reference
		// (Don't create a new array here)
		this.activeExtension.length = 0;

		// Add new extension to the array
		this.activeExtension.push(inlinePlugin(this.app, this.settings));

		// Flush the changes to all editors
		this.app.workspace.updateOptions();
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
