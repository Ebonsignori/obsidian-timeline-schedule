import { Plugin, WorkspaceLeaf } from "obsidian";
import {
	TimelineScheduleSettings as TimelineScheduleSettings,
	DEFAULT_SETTINGS,
	SettingsTab,
} from "./settings/settings";
import { editorExtension } from "./extension-handler";
import { EditorView } from "@codemirror/view";

export default class TimelineSchedule extends Plugin {
	settings: TimelineScheduleSettings;
	activeExtension: any;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new SettingsTab(this.app, this));

		this.registerMarkdownCodeBlockProcessor(
			this.settings.blockVariableName,
			(source, el, ctx) => {
				console.log("Here in CodeBlock", source, el, ctx);
			}
		);

		this.registerMarkdownPostProcessor((el, ctx) => {
			console.log("Here in PostProcessor", el, ctx);
		});

		if (this.settings.enableCodeblockTextCompletion) {
			this.registerEditorExtension(editorExtension);
			this.giveExtensionProps(this.app.workspace.getMostRecentLeaf());
			const onLeafChange = async (leaf: WorkspaceLeaf) => {
				this.giveExtensionProps(leaf);
			};
			this.registerEvent(
				this.app.workspace.on(
					"active-leaf-change",
					onLeafChange.bind(this)
				)
			);
		}
	}

	giveExtensionProps(leaf: WorkspaceLeaf | null): void {
		// @ts-expect-error editor is private
		const activeEditor = leaf?.view?.editor;
		if (activeEditor) {
			const editorView = activeEditor.cm as EditorView;
			const editorPlug = editorView.plugin(editorExtension);
			if (editorPlug) {
				this.activeExtension = editorPlug;
			}
			editorPlug?.updateProps(this.app, this.settings);
		}
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
