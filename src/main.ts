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

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new SettingsTab(this.app, this));

		if (this.settings.renderInPreviewMode) {
			this.registerMarkdownCodeBlockProcessor(
				this.settings.blockVariableName,
				(source, el, ctx) => {
					if (source.trim()) {
						ctx.addChild(new PrettyRender(el, source));
					}
				}
			);
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

	updateEditorProcessors() {
		// Update the active extension
		// Empty the array while keeping the same reference
		// (Don't create a new array here)
		this.activeExtension.length = 0;

		// Add new extension to the array
		this.activeExtension.push(inlinePlugin(this.app, this.settings));

		// Update the active markdown processor
		// TODO: Unregister the old processor without needing reset?
		this.registerMarkdownCodeBlockProcessor(
			this.settings.blockVariableName,
			(source, el, ctx) => {
				if (source.trim()) {
					ctx.addChild(new PrettyRender(el, source));
				}
			}
		);

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
