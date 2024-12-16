"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spawnPokemonDeactivate = exports.activate = exports.storeCollectionAsMemento = exports.PokemonSpecification = void 0;
const vscode = require("vscode");
const types_1 = require("../common/types");
const names_1 = require("../common/names");
const localize = require("../common/localize");
const pokemon_collection_1 = require("../panel/pokemon-collection");
const pokemon_data_1 = require("../common/pokemon-data");
const EXTRA_POKEMON_KEY = 'vscode-pokemon.extra-pokemon';
const EXTRA_POKEMON_KEY_TYPES = EXTRA_POKEMON_KEY + '.types';
const EXTRA_POKEMON_KEY_COLORS = EXTRA_POKEMON_KEY + '.colors';
const EXTRA_POKEMON_KEY_NAMES = EXTRA_POKEMON_KEY + '.names';
const DEFAULT_POKEMON_SCALE = "nano" /* PokemonSize.nano */;
const DEFAULT_COLOR = "default" /* PokemonColor.default */;
const DEFAULT_POKEMON_TYPE = (0, pokemon_data_1.getDefaultPokemon)();
const DEFAULT_POSITION = "panel" /* ExtPosition.panel */;
const DEFAULT_THEME = "none" /* Theme.none */;
class PokemonQuickPickItem {
    name_;
    type;
    color;
    constructor(name_, type, color) {
        this.name_ = name_;
        this.type = type;
        this.color = color;
        this.name = name_;
        this.label = name_;
        this.description = `${color} ${type}`;
    }
    name;
    label;
    kind;
    description;
    detail;
    picked;
    alwaysShow;
    buttons;
}
let webviewViewProvider;
function getConfiguredSize() {
    var size = vscode.workspace
        .getConfiguration('vscode-pokemon')
        .get('pokemonSize', DEFAULT_POKEMON_SCALE);
    if (types_1.ALL_SCALES.lastIndexOf(size) === -1) {
        size = DEFAULT_POKEMON_SCALE;
    }
    return size;
}
function getConfiguredTheme() {
    var theme = vscode.workspace
        .getConfiguration('vscode-pokemon')
        .get('theme', DEFAULT_THEME);
    if (types_1.ALL_THEMES.lastIndexOf(theme) === -1) {
        theme = DEFAULT_THEME;
    }
    return theme;
}
function getConfiguredThemeKind() {
    return vscode.window.activeColorTheme.kind;
}
function getConfigurationPosition() {
    return vscode.workspace
        .getConfiguration('vscode-pokemon')
        .get('position', DEFAULT_POSITION);
}
function getThrowWithMouseConfiguration() {
    return vscode.workspace
        .getConfiguration('vscode-pokemon')
        .get('throwBallWithMouse', true);
}
function updatePanelThrowWithMouse() {
    const panel = getPokemonPanel();
    if (panel !== undefined) {
        panel.setThrowWithMouse(getThrowWithMouseConfiguration());
    }
}
async function updateExtensionPositionContext() {
    await vscode.commands.executeCommand('setContext', 'vscode-pokemon.position', getConfigurationPosition());
}
class PokemonSpecification {
    color;
    type;
    size;
    name;
    generation;
    originalSpriteSize;
    constructor(color, type, size, name, generation, originalSpriteSize) {
        this.color = color;
        this.type = type;
        this.size = size;
        if (!name) {
            this.name = (0, names_1.randomName)(type);
        }
        else {
            this.name = name;
        }
        this.generation = generation || `gen${pokemon_data_1.POKEMON_DATA[type].generation}`;
        this.originalSpriteSize = pokemon_data_1.POKEMON_DATA[type].originalSpriteSize || 32;
    }
    static fromConfiguration() {
        var color = vscode.workspace
            .getConfiguration('vscode-pokemon')
            .get('pokemonColor', DEFAULT_COLOR);
        if (types_1.ALL_COLORS.lastIndexOf(color) === -1) {
            color = DEFAULT_COLOR;
        }
        var type = vscode.workspace
            .getConfiguration('vscode-pokemon')
            .get('pokemonType', DEFAULT_POKEMON_TYPE);
        // Use POKEMON_DATA to validate the type
        if (!pokemon_data_1.POKEMON_DATA[type]) {
            type = DEFAULT_POKEMON_TYPE;
        }
        return new PokemonSpecification(color, type, getConfiguredSize());
    }
    static collectionFromMemento(context, size) {
        var contextTypes = context.globalState.get(EXTRA_POKEMON_KEY_TYPES, []);
        var contextColors = context.globalState.get(EXTRA_POKEMON_KEY_COLORS, []);
        var contextNames = context.globalState.get(EXTRA_POKEMON_KEY_NAMES, []);
        var result = new Array();
        for (let index = 0; index < contextTypes.length; index++) {
            result.push(new PokemonSpecification(contextColors?.[index] ?? DEFAULT_COLOR, contextTypes[index], size, contextNames[index]));
        }
        return result;
    }
}
exports.PokemonSpecification = PokemonSpecification;
async function storeCollectionAsMemento(context, collection) {
    var contextTypes = new Array(collection.length);
    var contextColors = new Array(collection.length);
    var contextNames = new Array(collection.length);
    for (let index = 0; index < collection.length; index++) {
        contextTypes[index] = collection[index].type;
        contextColors[index] = collection[index].color;
        contextNames[index] = collection[index].name;
    }
    await context.globalState.update(EXTRA_POKEMON_KEY_TYPES, contextTypes);
    await context.globalState.update(EXTRA_POKEMON_KEY_COLORS, contextColors);
    await context.globalState.update(EXTRA_POKEMON_KEY_NAMES, contextNames);
    context.globalState.setKeysForSync([
        EXTRA_POKEMON_KEY_TYPES,
        EXTRA_POKEMON_KEY_COLORS,
        EXTRA_POKEMON_KEY_NAMES,
    ]);
}
exports.storeCollectionAsMemento = storeCollectionAsMemento;
let spawnPokemonStatusBar;
async function handleRemovePokemonMessage(message) {
    var pokemonList = Array();
    switch (message.command) {
        case 'list-pokemon':
            message.text.split('\n').forEach((pokemon) => {
                if (!pokemon) {
                    return;
                }
                var parts = pokemon.split(',');
                pokemonList.push({
                    type: parts[0],
                    name: parts[1],
                    color: parts[2],
                });
            });
            break;
        default:
            return;
    }
    if (!pokemonList) {
        return;
    }
    if (!pokemonList.length) {
        await vscode.window.showErrorMessage(vscode.l10n.t('There are no pokemon to remove.'));
        return;
    }
    await vscode.window
        .showQuickPick(pokemonList.map((val) => {
        return new PokemonQuickPickItem(val.name, val.type, val.color);
    }), {
        placeHolder: vscode.l10n.t('Select the pokemon to remove.'),
    })
        .then(async (pokemon) => {
        if (pokemon) {
            const panel = getPokemonPanel();
            if (panel !== undefined) {
                panel.deletePokemon(pokemon.name);
                const collection = pokemonList
                    .filter((item) => {
                    return item.name !== pokemon.name;
                })
                    .map((item) => {
                    return new PokemonSpecification(item.color, item.type, "medium" /* PokemonSize.medium */, item.name);
                });
                await storeCollectionAsMemento(this, collection);
            }
        }
    });
}
function getPokemonPanel() {
    if (getConfigurationPosition() === "explorer" /* ExtPosition.explorer */ &&
        webviewViewProvider) {
        return webviewViewProvider;
    }
    else if (PokemonPanel.currentPanel) {
        return PokemonPanel.currentPanel;
    }
    else {
        return undefined;
    }
}
function getWebview() {
    if (getConfigurationPosition() === "explorer" /* ExtPosition.explorer */ &&
        webviewViewProvider) {
        return webviewViewProvider.getWebview();
    }
    else if (PokemonPanel.currentPanel) {
        return PokemonPanel.currentPanel.getWebview();
    }
}
function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand('vscode-pokemon.start', async () => {
        if (getConfigurationPosition() === "explorer" /* ExtPosition.explorer */ &&
            webviewViewProvider) {
            await vscode.commands.executeCommand('pokemonView.focus');
        }
        else {
            const spec = PokemonSpecification.fromConfiguration();
            PokemonPanel.createOrShow(context.extensionUri, spec.color, spec.type, spec.size, spec.generation, spec.originalSpriteSize, getConfiguredTheme(), getConfiguredThemeKind(), getThrowWithMouseConfiguration());
            if (PokemonPanel.currentPanel) {
                var collection = PokemonSpecification.collectionFromMemento(context, getConfiguredSize());
                collection.forEach((item) => {
                    PokemonPanel.currentPanel?.spawnPokemon(item);
                });
                // Store the collection in the memento, incase any of the null values (e.g. name) have been set
                await storeCollectionAsMemento(context, collection);
            }
        }
    }));
    spawnPokemonStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    spawnPokemonStatusBar.command = 'vscode-pokemon.spawn-pokemon';
    context.subscriptions.push(spawnPokemonStatusBar);
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateStatusBar));
    context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(updateStatusBar));
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateExtensionPositionContext));
    updateStatusBar();
    const spec = PokemonSpecification.fromConfiguration();
    webviewViewProvider = new PokemonWebviewViewProvider(context.extensionUri, spec.color, spec.type, spec.size, spec.generation, spec.originalSpriteSize, getConfiguredTheme(), getConfiguredThemeKind(), getThrowWithMouseConfiguration());
    updateExtensionPositionContext().catch((e) => {
        console.error(e);
    });
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(PokemonWebviewViewProvider.viewType, webviewViewProvider));
    context.subscriptions.push(vscode.commands.registerCommand('vscode-pokemon.delete-pokemon', async () => {
        const panel = getPokemonPanel();
        if (panel !== undefined) {
            panel.listPokemon();
            getWebview()?.onDidReceiveMessage(handleRemovePokemonMessage, context);
        }
        else {
            await createPokemonPlayground(context);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('vscode-pokemon.roll-call', async () => {
        const panel = getPokemonPanel();
        if (panel !== undefined) {
            panel.rollCall();
        }
        else {
            await createPokemonPlayground(context);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('vscode-pokemon.export-pokemon-list', async () => {
        const pokemonCollection = PokemonSpecification.collectionFromMemento(context, getConfiguredSize());
        const pokemonJson = JSON.stringify(pokemonCollection, null, 2);
        const fileName = `pokemonCollection-${Date.now()}.json`;
        if (!vscode.workspace.workspaceFolders) {
            await vscode.window.showErrorMessage(vscode.l10n.t('You must have a folder or workspace open to export pokemonCollection.'));
            return;
        }
        const filePath = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, fileName);
        const newUri = vscode.Uri.file(fileName).with({
            scheme: 'untitled',
            path: filePath.fsPath,
        });
        await vscode.workspace
            .openTextDocument(newUri)
            .then(async (doc) => {
            await vscode.window
                .showTextDocument(doc)
                .then(async (editor) => {
                await editor.edit((edit) => {
                    edit.insert(new vscode.Position(0, 0), pokemonJson);
                });
            });
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand('vscode-pokemon.import-pokemon-list', async () => {
        const options = {
            canSelectMany: false,
            openLabel: 'Open pokemonCollection.json',
            filters: {
                json: ['json'],
            },
        };
        const fileUri = await vscode.window.showOpenDialog(options);
        if (fileUri && fileUri[0]) {
            console.log('Selected file: ' + fileUri[0].fsPath);
            try {
                const fileContents = await vscode.workspace.fs.readFile(fileUri[0]);
                const pokemonToLoad = JSON.parse(String.fromCharCode.apply(null, Array.from(fileContents)));
                // load the pokemon into the collection
                var collection = PokemonSpecification.collectionFromMemento(context, getConfiguredSize());
                // fetch just the pokemon types
                const panel = getPokemonPanel();
                for (let i = 0; i < pokemonToLoad.length; i++) {
                    const pokemon = pokemonToLoad[i];
                    const pokemonSpec = new PokemonSpecification((0, pokemon_collection_1.normalizeColor)(pokemon.color, pokemon.type), pokemon.type, pokemon.size, pokemon.name);
                    collection.push(pokemonSpec);
                    if (panel !== undefined) {
                        panel.spawnPokemon(pokemonSpec);
                    }
                }
                await storeCollectionAsMemento(context, collection);
            }
            catch (e) {
                await vscode.window.showErrorMessage(vscode.l10n.t('Failed to import pokemon: {0}', e?.message));
            }
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('vscode-pokemon.spawn-pokemon', async () => {
        const panel = getPokemonPanel();
        if (getConfigurationPosition() === "explorer" /* ExtPosition.explorer */ && webviewViewProvider) {
            await vscode.commands.executeCommand('pokemonView.focus');
        }
        if (panel) {
            // First, select a generation
            const generations = Object.values(types_1.PokemonGeneration)
                .filter(gen => typeof gen === 'number')
                .map(gen => ({
                label: `Generation ${gen}`,
                value: gen,
                description: `Gen ${gen} Pokémon`
            }));
            const selectedGeneration = await vscode.window.showQuickPick(generations, {
                placeHolder: vscode.l10n.t('Select a generation'),
            });
            if (!selectedGeneration) {
                console.log('Cancelled Spawning Pokemon - No Generation Selected');
                return;
            }
            // Get Pokémon from selected generation
            const pokemonInGeneration = (0, pokemon_data_1.getPokemonByGeneration)(selectedGeneration.value);
            const pokemonOptions = pokemonInGeneration.map(type => ({
                label: pokemon_data_1.POKEMON_DATA[type].name,
                value: type,
                description: `#${pokemon_data_1.POKEMON_DATA[type].id.toString().padStart(4, '0')}`
            }));
            const selectedPokemonType = await vscode.window.showQuickPick(pokemonOptions, {
                placeHolder: vscode.l10n.t('Select a Pokémon'),
            });
            if (!selectedPokemonType) {
                console.log('Cancelled Spawning Pokemon - No Pokémon Selected');
                return;
            }
            // Rest of the existing code
            var pokemonColor = DEFAULT_COLOR;
            const possibleColors = (0, pokemon_collection_1.availableColors)(selectedPokemonType.value);
            if (possibleColors.length > 1) {
                var selectedColor = await vscode.window.showQuickPick(localize.stringListAsQuickPickItemList(possibleColors), {
                    placeHolder: vscode.l10n.t('Select a color'),
                });
                if (!selectedColor) {
                    console.log('Cancelled Spawning Pokemon - No Color Selected');
                    return;
                }
                pokemonColor = selectedColor.value;
            }
            else {
                pokemonColor = possibleColors[0];
            }
            const name = await vscode.window.showInputBox({
                placeHolder: vscode.l10n.t('Leave blank for a random name'),
                prompt: vscode.l10n.t('Name your Pokémon'),
                value: (0, names_1.randomName)(selectedPokemonType.value),
            });
            const spec = new PokemonSpecification(pokemonColor, selectedPokemonType.value, getConfiguredSize(), name);
            panel.spawnPokemon(spec);
            var collection = PokemonSpecification.collectionFromMemento(context, getConfiguredSize());
            collection.push(spec);
            await storeCollectionAsMemento(context, collection);
        }
        else {
            await createPokemonPlayground(context);
            await vscode.window.showInformationMessage(vscode.l10n.t("A Pokemon Playground has been created. You can now use the 'Spawn Additional Pokemon' Command to add more Pokemon."));
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('vscode-pokemon.spawn-random-pokemon', async () => {
        const panel = getPokemonPanel();
        if (getConfigurationPosition() === "explorer" /* ExtPosition.explorer */ && webviewViewProvider) {
            await vscode.commands.executeCommand('pokemonView.focus');
        }
        if (panel) {
            var [randomPokemonType, randomPokemonConfig] = (0, pokemon_data_1.getRandomPokemonConfig)();
            const spec = new PokemonSpecification(randomPokemonConfig.possibleColors[0], randomPokemonType, getConfiguredSize(), randomPokemonConfig.name);
            panel.spawnPokemon(spec);
            var collection = PokemonSpecification.collectionFromMemento(context, getConfiguredSize());
            collection.push(spec);
            await storeCollectionAsMemento(context, collection);
        }
        else {
            await createPokemonPlayground(context);
            await vscode.window.showInformationMessage(vscode.l10n.t("A Pokemon Playground has been created. You can now use the 'Remove All Pokemon' Command to remove all Pokemon."));
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('vscode-pokemon.remove-all-pokemon', async () => {
        const panel = getPokemonPanel();
        if (panel !== undefined) {
            panel.resetPokemon();
            await storeCollectionAsMemento(context, []);
        }
        else {
            await createPokemonPlayground(context);
            await vscode.window.showInformationMessage(vscode.l10n.t("A Pokemon Playground has been created. You can now use the 'Remove All Pokemon' Command to remove all Pokemon."));
        }
    }));
    // Listening to configuration changes
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('vscode-pokemon.pokemonColor') ||
            e.affectsConfiguration('vscode-pokemon.pokemonType') ||
            e.affectsConfiguration('vscode-pokemon.pokemonSize') ||
            e.affectsConfiguration('vscode-pokemon.theme') ||
            e.affectsConfiguration('workbench.colorTheme')) {
            const spec = PokemonSpecification.fromConfiguration();
            const panel = getPokemonPanel();
            if (panel) {
                panel.updatePokemonColor(spec.color);
                panel.updatePokemonSize(spec.size);
                panel.updatePokemonType(spec.type);
                panel.updateTheme(getConfiguredTheme(), getConfiguredThemeKind());
                panel.update();
            }
        }
        if (e.affectsConfiguration('vscode-pokemon.position')) {
            void updateExtensionPositionContext();
        }
        if (e.affectsConfiguration('vscode-pokemon.throwBallWithMouse')) {
            updatePanelThrowWithMouse();
        }
    }));
    if (vscode.window.registerWebviewPanelSerializer) {
        // Make sure we register a serializer in activation event
        vscode.window.registerWebviewPanelSerializer(PokemonPanel.viewType, {
            async deserializeWebviewPanel(webviewPanel) {
                // Reset the webview options so we use latest uri for `localResourceRoots`.
                webviewPanel.webview.options = getWebviewOptions(context.extensionUri);
                const spec = PokemonSpecification.fromConfiguration();
                PokemonPanel.revive(webviewPanel, context.extensionUri, spec.color, spec.type, spec.size, spec.generation, spec.originalSpriteSize, getConfiguredTheme(), getConfiguredThemeKind(), getThrowWithMouseConfiguration());
            },
        });
    }
}
exports.activate = activate;
function updateStatusBar() {
    spawnPokemonStatusBar.text = `$(squirrel)`;
    spawnPokemonStatusBar.tooltip = vscode.l10n.t('Spawn Pokemon');
    spawnPokemonStatusBar.show();
}
function spawnPokemonDeactivate() {
    spawnPokemonStatusBar.dispose();
}
exports.spawnPokemonDeactivate = spawnPokemonDeactivate;
function getWebviewOptions(extensionUri) {
    return {
        // Enable javascript in the webview
        enableScripts: true,
        // And restrict the webview to only loading content from our extension's `media` directory.
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
    };
}
class PokemonWebviewContainer {
    _extensionUri;
    _disposables = [];
    _pokemonColor;
    _pokemonType;
    _pokemonSize;
    _pokemonGeneration;
    _pokemonOriginalSpriteSize;
    _theme;
    _themeKind;
    _throwBallWithMouse;
    constructor(extensionUri, color, type, size, generation, originalSpriteSize, theme, themeKind, throwBallWithMouse) {
        this._extensionUri = extensionUri;
        this._pokemonColor = color;
        this._pokemonType = type;
        this._pokemonSize = size;
        this._pokemonGeneration = generation;
        this._pokemonOriginalSpriteSize = originalSpriteSize;
        this._theme = theme;
        this._themeKind = themeKind;
        this._throwBallWithMouse = throwBallWithMouse;
    }
    pokemonColor() {
        return (0, pokemon_collection_1.normalizeColor)(this._pokemonColor, this._pokemonType);
    }
    pokemonType() {
        return this._pokemonType;
    }
    pokemonSize() {
        return this._pokemonSize;
    }
    pokemonGeneration() {
        return this._pokemonGeneration;
    }
    pokemonOriginalSpriteSize() {
        return this._pokemonOriginalSpriteSize;
    }
    theme() {
        return this._theme;
    }
    themeKind() {
        return this._themeKind;
    }
    throwBallWithMouse() {
        return this._throwBallWithMouse;
    }
    updatePokemonColor(newColor) {
        this._pokemonColor = newColor;
    }
    updatePokemonType(newType) {
        this._pokemonType = newType;
    }
    updatePokemonSize(newSize) {
        this._pokemonSize = newSize;
    }
    updatePokemonGeneration(newGeneration) {
        this._pokemonGeneration = newGeneration;
    }
    updateTheme(newTheme, themeKind) {
        this._theme = newTheme;
        this._themeKind = themeKind;
    }
    setThrowWithMouse(newThrowWithMouse) {
        this._throwBallWithMouse = newThrowWithMouse;
        void this.getWebview().postMessage({
            command: 'throw-with-mouse',
            enabled: newThrowWithMouse,
        });
    }
    throwBall() {
        void this.getWebview().postMessage({
            command: 'throw-ball',
        });
    }
    resetPokemon() {
        void this.getWebview().postMessage({
            command: 'reset-pokemon',
        });
    }
    spawnPokemon(spec) {
        void this.getWebview().postMessage({
            command: 'spawn-pokemon',
            type: spec.type,
            color: spec.color,
            name: spec.name,
            generation: spec.generation,
            originalSpriteSize: spec.originalSpriteSize,
        });
        void this.getWebview().postMessage({
            command: 'set-size',
            size: spec.size,
        });
    }
    listPokemon() {
        void this.getWebview().postMessage({ command: 'list-pokemon' });
    }
    rollCall() {
        void this.getWebview().postMessage({ command: 'roll-call' });
    }
    deletePokemon(pokemonName) {
        void this.getWebview().postMessage({
            command: 'delete-pokemon',
            name: pokemonName,
        });
    }
    getWebview() {
        throw new Error('Not implemented');
    }
    _update() {
        const webview = this.getWebview();
        webview.html = this._getHtmlForWebview(webview);
    }
    update() { }
    _getHtmlForWebview(webview) {
        // Local path to main script run in the webview
        const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'main-bundle.js');
        // And the uri we use to load this script in the webview
        const scriptUri = webview.asWebviewUri(scriptPathOnDisk);
        // Local path to css styles
        const styleResetPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css');
        const stylesPathMainPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'pokemon.css');
        const silkScreenFontPath = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'Silkscreen-Regular.ttf'));
        // Uri to load styles into webview
        const stylesResetUri = webview.asWebviewUri(styleResetPath);
        const stylesMainUri = webview.asWebviewUri(stylesPathMainPath);
        // Get path to resource on disk
        const basePokemonUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media'));
        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();
        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'nonce-${nonce}'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';
                font-src ${webview.cspSource};">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${stylesResetUri}" rel="stylesheet" nonce="${nonce}">
				<link href="${stylesMainUri}" rel="stylesheet" nonce="${nonce}">
                <style nonce="${nonce}">
                @font-face {
                    font-family: 'silkscreen';
                    src: url('${silkScreenFontPath}') format('truetype');
                }
                </style>
				<title>VS Code Pokemon</title>
			</head>
			<body>
                <canvas id="pokemonCanvas"></canvas>
                <div id="pokemonContainer"></div>
                <div id="foreground"></div>
                <script nonce="${nonce}" src="${scriptUri}"></script>
                <script nonce="${nonce}">
                    pokemonApp.pokemonPanelApp(
                        "${basePokemonUri}",
                        "${this.theme()}",
                        ${this.themeKind()},
                        "${this.pokemonColor()}",
                        "${this.pokemonSize()}",
                        "${this.pokemonType()}",
                        "${this.throwBallWithMouse()}",
                        "${this.pokemonGeneration()}",
                        "${this.pokemonOriginalSpriteSize()}",
                    );
                </script>
            </body>
			</html>`;
    }
}
function handleWebviewMessage(message) {
    switch (message.command) {
        case 'alert':
            void vscode.window.showErrorMessage(message.text);
            return;
        case 'info':
            void vscode.window.showInformationMessage(message.text);
            return;
    }
}
/**
 * Manages pokemon coding webview panels
 */
class PokemonPanel extends PokemonWebviewContainer {
    /**
     * Track the currently panel. Only allow a single panel to exist at a time.
     */
    static currentPanel;
    static viewType = 'pokemonCoding';
    _panel;
    static createOrShow(extensionUri, pokemonColor, pokemonType, pokemonSize, pokemonGeneration, pokemonOriginalSpriteSize, theme, themeKind, throwBallWithMouse) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        // If we already have a panel, show it.
        if (PokemonPanel.currentPanel) {
            if (pokemonColor === PokemonPanel.currentPanel.pokemonColor() &&
                pokemonType === PokemonPanel.currentPanel.pokemonType() &&
                pokemonSize === PokemonPanel.currentPanel.pokemonSize() &&
                pokemonGeneration === PokemonPanel.currentPanel.pokemonGeneration()) {
                PokemonPanel.currentPanel._panel.reveal(column);
                return;
            }
            else {
                PokemonPanel.currentPanel.updatePokemonColor(pokemonColor);
                PokemonPanel.currentPanel.updatePokemonType(pokemonType);
                PokemonPanel.currentPanel.updatePokemonSize(pokemonSize);
                PokemonPanel.currentPanel.update();
            }
        }
        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(PokemonPanel.viewType, vscode.l10n.t('Pokemon Panel'), vscode.ViewColumn.Two, getWebviewOptions(extensionUri));
        PokemonPanel.currentPanel = new PokemonPanel(panel, extensionUri, pokemonColor, pokemonType, pokemonSize, pokemonGeneration, pokemonOriginalSpriteSize, theme, themeKind, throwBallWithMouse);
    }
    resetPokemon() {
        void this.getWebview().postMessage({ command: 'reset-pokemon' });
    }
    listPokemon() {
        void this.getWebview().postMessage({ command: 'list-pokemon' });
    }
    rollCall() {
        void this.getWebview().postMessage({ command: 'roll-call' });
    }
    deletePokemon(pokemonName) {
        void this.getWebview().postMessage({
            command: 'delete-pokemon',
            name: pokemonName,
        });
    }
    static revive(panel, extensionUri, pokemonColor, pokemonType, pokemonSize, pokemonGeneration, pokemonOriginalSpriteSize, theme, themeKind, throwBallWithMouse) {
        PokemonPanel.currentPanel = new PokemonPanel(panel, extensionUri, pokemonColor, pokemonType, pokemonSize, pokemonGeneration, pokemonOriginalSpriteSize, theme, themeKind, throwBallWithMouse);
    }
    constructor(panel, extensionUri, color, type, size, generation, originalSpriteSize, theme, themeKind, throwBallWithMouse) {
        super(extensionUri, color, type, size, generation, originalSpriteSize, theme, themeKind, throwBallWithMouse);
        this._panel = panel;
        // Set the webview's initial html content
        this._update();
        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        // Update the content based on view changes
        this._panel.onDidChangeViewState(() => {
            this.update();
        }, null, this._disposables);
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(handleWebviewMessage, null, this._disposables);
    }
    dispose() {
        PokemonPanel.currentPanel = undefined;
        // Clean up our resources
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
    update() {
        if (this._panel.visible) {
            this._update();
        }
    }
    getWebview() {
        return this._panel.webview;
    }
}
class PokemonWebviewViewProvider extends PokemonWebviewContainer {
    static viewType = 'pokemonView';
    _webviewView;
    resolveWebviewView(webviewView) {
        this._webviewView = webviewView;
        webviewView.webview.options = getWebviewOptions(this._extensionUri);
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        webviewView.webview.onDidReceiveMessage(handleWebviewMessage, null, this._disposables);
    }
    update() {
        this._update();
    }
    getWebview() {
        if (this._webviewView === undefined) {
            throw new Error(vscode.l10n.t('Panel not active, make sure the pokemon view is visible before running this command.'));
        }
        else {
            return this._webviewView.webview;
        }
    }
}
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
async function createPokemonPlayground(context) {
    const spec = PokemonSpecification.fromConfiguration();
    PokemonPanel.createOrShow(context.extensionUri, spec.color, spec.type, spec.size, spec.generation, spec.originalSpriteSize, getConfiguredTheme(), getConfiguredThemeKind(), getThrowWithMouseConfiguration());
    if (PokemonPanel.currentPanel) {
        var collection = PokemonSpecification.collectionFromMemento(context, getConfiguredSize());
        collection.forEach((item) => {
            PokemonPanel.currentPanel?.spawnPokemon(item);
        });
        await storeCollectionAsMemento(context, collection);
    }
    else {
        var collection = PokemonSpecification.collectionFromMemento(context, getConfiguredSize());
        collection.push(spec);
        await storeCollectionAsMemento(context, collection);
    }
}
//# sourceMappingURL=extension.js.map