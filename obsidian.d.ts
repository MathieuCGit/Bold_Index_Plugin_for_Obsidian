declare module 'obsidian' {
  export interface TFile {
    path: string;
    name: string;
  }

  export interface Editor {
    // Common editor helpers used by plugins
    setSelection?(anchor: {line:number, ch:number} | number, head?: {line:number, ch:number} | number): void;
    setCursor?(pos: {line:number, ch:number}): void;
    // Allow accessing other editor-specific APIs (CodeMirror, etc.)
    [key: string]: any;
  }

  export interface MarkdownView {
    file: TFile;
    editor: Editor;
    getViewType?(): string;
  }

  export interface WorkspaceLeaf {
    view?: MarkdownView;
    openFile?(file: TFile): Promise<void>;
    setViewState?(state: any): Promise<void>;
  }

  export interface Workspace {
    getLeavesOfType(type: string): WorkspaceLeaf[];
    getActiveFile(): TFile | null;
    activeLeaf?: WorkspaceLeaf | null;
    getRightLeaf?(open?: boolean): WorkspaceLeaf | null;
    revealLeaf?(leaf: WorkspaceLeaf): void;
  }

  export class Vault {
    read(file: TFile): Promise<string>;
  }

  export interface App {
    workspace: Workspace;
    vault: Vault;
  }

  export class Plugin {
    app: App;
    manifest?: any;
    load?(): Promise<void>;
    onunload?(): void;
    registerView?(viewType: string, factory: (leaf: WorkspaceLeaf) => any): void;
    addCommand?(command: any): void;
  }

  export const MarkdownView: any;
  export const ItemView: any;
}

// Allow simple import-less ambient reference when needed
declare global {
  interface Window {}
}
