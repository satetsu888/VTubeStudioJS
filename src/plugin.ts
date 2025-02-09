import { filterFalsy } from './utils'
import type { ApiClient } from './endpoints'
import { VTubeStudioError, ErrorCode } from './types'

/**
 * Warning: this class is not intended to be instantiated directly. Use the instances returned by {@link Plugin} methods instead! 
 * @deprecated The object-oriented plugin wrapper is deprecated and will be removed in a future release. Use {@link ApiClient} directly instead.
 **/
export class Parameter {
    constructor(protected vts: Plugin, public readonly model: CurrentModel, public readonly name: string, public value: number, public min: number, public max: number, public defaultValue: number) { }

    async refresh(): Promise<Parameter> {
        const { value, min, max, defaultValue } = await this.vts.apiClient.parameterValue({ name: this.name })
        this.value = value
        this.min = min
        this.max = max
        this.defaultValue = defaultValue
        return this
    }

    async setValue(value: number, weight: number = 1, mode: 'add' | 'set' = 'set'): Promise<Parameter> {
        await this.vts.apiClient.injectParameterData({ parameterValues: [{ id: this.name, weight, value }], faceFound: false, mode })
        this.value = value
        return this
    }
}

/**
 * Warning: this class is not intended to be instantiated directly. Use the instances returned by {@link Plugin} methods instead! 
 * @deprecated The object-oriented plugin wrapper is deprecated and will be removed in a future release. Use {@link ApiClient} directly instead.
 **/
export class CustomParameter extends Parameter {
    constructor(vts: Plugin, model: CurrentModel, name: string, value: number, min: number, max: number, defaultValue: number, public readonly explanation: string) { super(vts, model, name, value, min, max, defaultValue) }

    async update({ min, max, defaultValue }: Partial<{ min: number, max: number, defaultValue: number }>): Promise<Parameter> {
        await this.vts.apiClient.parameterCreation({ parameterName: this.name, explanation: this.explanation, min: min ?? this.min, max: max ?? this.max, defaultValue: defaultValue ?? this.defaultValue })
        this.min = min ?? this.min
        this.max = max ?? this.max
        this.defaultValue = defaultValue ?? this.defaultValue
        return this
    }

    async delete(): Promise<void> {
        await this.vts.apiClient.parameterDeletion({ parameterName: this.name })
    }
}

/**
 * Warning: this class is not intended to be instantiated directly. Use the instances returned by {@link Plugin} methods instead! 
 * @deprecated The object-oriented plugin wrapper is deprecated and will be removed in a future release. Use {@link ApiClient} directly instead.
 **/
export class Expression {
    constructor(protected vts: Plugin, public readonly model: CurrentModel, public readonly name: string, public readonly file: string, public active: boolean, public deactivateWhenKeyIsLetGo: boolean, public autoDeactivateAfterSeconds: boolean, public secondsRemaining: boolean, private usedInHotkeys: { name: string, id: string }[], private parameters: { name: string, value: number }[]) { }

    async refresh(): Promise<Expression> {
        const { expressions } = await this.vts.apiClient.expressionState({ details: true, expressionFile: this.file })
        const expr = expressions.find(e => e.file === this.file)
        if (expr) {
            this.active = expr.active
            this.deactivateWhenKeyIsLetGo = expr.deactivateWhenKeyIsLetGo
            this.autoDeactivateAfterSeconds = expr.autoDeactivateAfterSeconds
            this.secondsRemaining = expr.secondsRemaining
            this.usedInHotkeys = expr.usedInHotkeys
            this.parameters = expr.parameters
        }
        return this
    }

    async activate(): Promise<void> {
        await this.vts.apiClient.expressionActivation({ expressionFile: this.file, active: true })
    }

    async deactivate(): Promise<void> {
        await this.vts.apiClient.expressionActivation({ expressionFile: this.file, active: false })
    }

    async hotkeys(): Promise<Hotkey[]> {
        const hotkeys = await this.model.hotkeys()
        return this.usedInHotkeys.map(h => hotkeys.find(hk => hk.id === h.id)).filter(filterFalsy)
    }

    async live2DParameters(): Promise<Parameter[]> {
        const params = await this.model.live2DParameters()
        return this.parameters.map(p => params.find(pm => pm.name === p.name)).filter(filterFalsy)
    }
}

/**
 * Warning: this class is not intended to be instantiated directly. Use the instances returned by {@link Plugin} methods instead! 
 * @deprecated The object-oriented plugin wrapper is deprecated and will be removed in a future release. Use {@link ApiClient} directly instead.
 **/
export class Hotkey {
    constructor(protected vts: Plugin, public readonly model: CurrentModel, public readonly id: string, public readonly type: string, public readonly name: string, public readonly file: string, public readonly description: string) { }

    async trigger(): Promise<void> {
        await this.vts.apiClient.hotkeyTrigger({ hotkeyID: this.id })
    }
}

/**
 * Warning: this class is not intended to be instantiated directly. Use the instances returned by {@link Plugin} methods instead! 
 * @deprecated The object-oriented plugin wrapper is deprecated and will be removed in a future release. Use {@link ApiClient} directly instead.
 **/
export class Model {
    constructor(protected vts: Plugin, public readonly id: string, public readonly name: string, public readonly vtsModelName: string, public readonly vtsModelIconName: string) { }

    async load(): Promise<CurrentModel> {
        await this.vts.apiClient.modelLoad({ modelID: this.id })
        return (await this.vts.currentModel())!
    }
}

/**
 * Warning: this class is not intended to be instantiated directly. Use the instances returned by {@link Plugin} methods instead! 
 * @deprecated The object-oriented plugin wrapper is deprecated and will be removed in a future release. Use {@link ApiClient} directly instead.
 **/
export class CurrentModel {
    constructor(protected vts: Plugin, public readonly id: string, public readonly name: string, public readonly vtsModelName: string, public readonly live2DModelName: string, public readonly modelLoadTime: number, public readonly timeSinceModelLoaded: number, public readonly numberOfLive2DParameters: number, public readonly numberOfLive2DArtmeshes: number, public readonly hasPhysicsFile: boolean, public readonly numberOfTextures: number, public readonly textureResolution: number, public readonly positionX: number, public readonly positionY: number, public readonly rotation: number, public readonly size: number) { }

    async refresh(): Promise<CurrentModel | null> {
        const m = await this.vts.apiClient.currentModel()
        if (!m.modelLoaded) return null
        return new CurrentModel(this.vts, m.modelID, m.modelName, m.vtsModelName, m.live2DModelName, m.modelLoadTime, m.timeSinceModelLoaded, m.numberOfLive2DParameters, m.numberOfLive2DArtmeshes, m.hasPhysicsFile, m.numberOfTextures, m.textureResolution, m.modelPosition.positionX, m.modelPosition.positionY, m.modelPosition.rotation, m.modelPosition.size)
    }

    async position(): Promise<{ positionX: number, positionY: number, rotation: number, size: number } | null> {
        const m = await this.vts.apiClient.currentModel()
        if (!m.modelLoaded) return null
        return m.modelPosition
    }

    async moveBy(duration: number, by: { offsetX?: number, offsetY?: number, rotateBy?: number, sizeChange?: number }): Promise<void> {
        await this.vts.apiClient.moveModel({
            timeInSeconds: duration,
            valuesAreRelativeToModel: true,
            positionX: by.offsetX,
            positionY: by.offsetY,
            rotation: by.rotateBy,
            size: by.sizeChange,
        })
    }

    async moveTo(duration: number, to: { positionX?: number, positionY?: number, rotation?: number, size?: number }): Promise<void> {
        await this.vts.apiClient.moveModel({
            timeInSeconds: duration,
            valuesAreRelativeToModel: false,
            positionX: to.positionX,
            positionY: to.positionY,
            rotation: to.rotation,
            size: to.size,
        })
    }

    async expressions(): Promise<Expression[]> {
        const { expressions } = await this.vts.apiClient.expressionState({ details: true })
        return expressions.map(e => new Expression(this.vts, this, e.name, e.file, e.active, e.deactivateWhenKeyIsLetGo, e.autoDeactivateAfterSeconds, e.secondsRemaining, e.usedInHotkeys, e.parameters))
    }

    async hotkeys(): Promise<Hotkey[]> {
        const { availableHotkeys } = await this.vts.apiClient.hotkeysInCurrentModel()
        return availableHotkeys.map(k => new Hotkey(this.vts, this, k.hotkeyID, k.type, k.name, k.file, k.description))
    }

    async artMeshNames(): Promise<string[]> {
        const { artMeshNames } = await this.vts.apiClient.artMeshList()
        return artMeshNames
    }

    async artMeshTags(): Promise<string[]> {
        const { artMeshTags } = await this.vts.apiClient.artMeshList()
        return artMeshTags
    }

    async colorTint(color: { r: number, g: number, b: number, a?: number, mixWithSceneLightingColor?: number }, match?: { artMeshNumber?: number[], nameExact?: string[], nameContains?: string[], tagExact?: string[], tagContains?: string[] }): Promise<void> {
        await this.vts.apiClient.colorTint({
            colorTint: { colorR: color.r, colorG: color.g, colorB: color.b, colorA: color.a ?? 255, mixWithSceneLightingColor: color.mixWithSceneLightingColor },
            artMeshMatcher: { tintAll: !match, ...match }
        })
    }

    async live2DParameters(): Promise<Parameter[]> {
        const { parameters } = await this.vts.apiClient.live2DParameterList()
        return parameters.map(p => new Parameter(this.vts, this, p.name, p.value, p.min, p.max, p.defaultValue))
    }

    async customParameters(): Promise<Parameter[]> {
        const { customParameters } = await this.vts.apiClient.inputParameterList()
        return customParameters.map(p => new CustomParameter(this.vts, this, p.name, p.value, p.min, p.max, p.defaultValue, p.addedBy))
    }

    async defaultParameters(): Promise<Parameter[]> {
        const { defaultParameters } = await this.vts.apiClient.inputParameterList()
        return defaultParameters.map(p => new Parameter(this.vts, this, p.name, p.value, p.min, p.max, p.defaultValue))
    }

    async createParameter(name: string, explanation: string, min: number, max: number, defaultValue: number): Promise<CustomParameter> {
        await this.vts.apiClient.parameterCreation({ parameterName: name, explanation, min, max, defaultValue })
        return new CustomParameter(this.vts, this, name, defaultValue, min, max, defaultValue, this.vts.name)
    }
}

/**
 * Warning: this class is not intended to be instantiated directly. Use the instances returned by {@link Plugin} methods instead! 
 * @deprecated The object-oriented plugin wrapper is deprecated and will be removed in a future release. Use {@link ApiClient} directly instead.
 **/
export class Plugin {
    public apiClient: ApiClient
    protected isApiEnabled: boolean | null = null
    protected isAuthenticated: boolean | null = null
    protected isAuthenticating: boolean | null = null
    protected ongoingAuthCall: Promise<void> | null = null

    constructor(apiClient: ApiClient, public name: string, public author: string, public icon?: string | undefined, protected authenticationToken?: string | undefined, protected onAuthenticate?: (token: string) => void) {
        this.apiClient = this.wrapClient(apiClient)
    }

    private async checkApiState(): Promise<void> {
        if (this.isApiEnabled !== true) {
            const { active, currentSessionAuthenticated } = await this.apiClient.apiState()
            this.isApiEnabled = active
            if (currentSessionAuthenticated) this.isAuthenticated = true
        }
        if (!this.isApiEnabled) throw new VTubeStudioError({ errorID: ErrorCode.InternalClientError, message: 'API access is disabled.' }, 'N/A')
    }

    private async authenticate(): Promise<void> {
        if (this.isAuthenticated !== true && this.isAuthenticating !== true) {
            this.isAuthenticating = true
            try {
                if (this.authenticationToken !== undefined) {
                    try {
                        const auth = await this.apiClient.authentication({ authenticationToken: this.authenticationToken, pluginName: this.name, pluginDeveloper: this.author })
                        if (!auth.authenticated) throw new VTubeStudioError({ errorID: ErrorCode.TokenRequestDenied, message: auth.reason }, 'N/A')
                        this.isAuthenticated = true
                        this.isAuthenticating = false
                        return
                    } catch (e) {
                        console.error(e)
                    }
                }
                const { authenticationToken } = await this.apiClient.authenticationToken({ pluginName: this.name, pluginDeveloper: this.author, pluginIcon: this.icon })
                this.authenticationToken = authenticationToken
                this.isAuthenticated = true
                this.isAuthenticating = false
                this.onAuthenticate?.(authenticationToken)
            } catch (e) {
                console.error(e)
                this.isAuthenticated = null
                this.isAuthenticating = false
            }
        }
        if (!this.isAuthenticated) throw new VTubeStudioError({ errorID: ErrorCode.InternalClientError, message: 'Plugin could not authenticate.' }, 'N/A')
    }

    private wrapClient(apiClient: ApiClient) {
        const excludedKeys: Partial<{ [key in keyof ApiClient]: boolean }> = {
            apiState: true,
            authentication: true,
            authenticationToken: true,
        }

        const wrappedClient = { ...apiClient } as ApiClient
        Object.setPrototypeOf(wrappedClient, apiClient)
        const keys = Object.keys(wrappedClient) as (keyof ApiClient)[]
        for (const key of keys) {
            if (typeof wrappedClient[key] === 'function' && !excludedKeys[key]) {
                (wrappedClient as any)[key] = this.wrapSafeCall(wrappedClient[key] as any).bind(wrappedClient)
            }
        }
        return wrappedClient
    }

    private wrapSafeCall<Args extends any[], Returns>(call: (...args: Args) => Promise<Returns>): (...args: Args) => Promise<Returns> {
        return (...args: Args) => this.safeCall<Args, Returns>(call, ...args)
    }

    private async safeCall<Args extends any[], Returns>(call: (...args: Args) => Promise<Returns>, ...args: Args): Promise<Returns> {
        try {
            await this.checkApiState()
            await (this.ongoingAuthCall ?? (this.ongoingAuthCall = this.authenticate()))
            this.ongoingAuthCall = null
            return await call(...args)
        } catch (e) {
            if (e instanceof VTubeStudioError) {
                if (e.data.errorID === ErrorCode.APIAccessDeactivated) {
                    this.isApiEnabled = false
                }
                if (e.data.errorID === ErrorCode.RequestRequiresAuthetication) {
                    this.isAuthenticated = null
                    this.isAuthenticating = null
                    await (this.ongoingAuthCall ?? (this.ongoingAuthCall = this.authenticate()))
                    this.ongoingAuthCall = null
                    return await call(...args)
                }
            }
            throw e
        }
    }

    async apiState(): Promise<{
        active: boolean
        vTubeStudioVersion: `${number}.${number}.${number}`
        currentSessionAuthenticated: boolean
    }> {
        return await this.apiClient.apiState()
    }

    async statistics(): Promise<{
        uptime: number
        framerate: number
        vTubeStudioVersion: `${number}.${number}.${number}`
        allowedPlugins: number
        connectedPlugins: number
        startedWithSteam: boolean
        windowWidth: number
        windowHeight: number
        windowIsFullscreen: boolean
    }> {
        return await this.apiClient.statistics()
    }

    async folderNames(): Promise<{
        models: string
        backgrounds: string
        items: string
        config: string
        logs: string
        backup: string
    }> {
        return await this.apiClient.vtsFolderInfo()
    }

    async models(): Promise<Model[]> {
        const { availableModels } = await this.apiClient.availableModels()
        return availableModels.map(m => new Model(this, m.modelID, m.modelName, m.vtsModelName, m.vtsModelIconName))
    }

    async currentModel(): Promise<CurrentModel | null> {
        const m = await this.apiClient.currentModel()
        if (!m.modelLoaded) return null
        return new CurrentModel(this, m.modelID, m.modelName, m.vtsModelName, m.live2DModelName, m.modelLoadTime, m.timeSinceModelLoaded, m.numberOfLive2DParameters, m.numberOfLive2DArtmeshes, m.hasPhysicsFile, m.numberOfTextures, m.textureResolution, m.modelPosition.positionX, m.modelPosition.positionY, m.modelPosition.rotation, m.modelPosition.size)
    }

    async isFaceFound(): Promise<boolean> {
        return (await this.apiClient.faceFound()).found
    }

    async sceneColorOverlayInfo(): Promise<{
        active: boolean
        itemsIncluded: boolean
        isWindowCapture: boolean
        baseBrightness: number
        colorBoost: number
        smoothing: number
        colorOverlayR: number
        colorOverlayG: number
        colorOverlayB: number
        colorAvgR: number
        colorAvgG: number
        colorAvgB: number
        leftCapturePart: {
            active: boolean
            colorR: number
            colorG: number
            colorB: number
        }
        middleCapturePart: {
            active: boolean
            colorR: number
            colorG: number
            colorB: number
        }
        rightCapturePart: {
            active: boolean
            colorR: number
            colorG: number
            colorB: number
        }
    }> {
        return await this.apiClient.sceneColorOverlayInfo()
    }

    async ndiConfig(): Promise<{
        ndiActive: boolean
        useNDI5: boolean
        useCustomResolution: boolean
        customWidthNDI: number
        customHeightNDI: number
    }> {
        const { ndiActive, useNDI5, useCustomResolution, customWidthNDI, customHeightNDI } = await this.apiClient.ndiConfig({
            setNewConfig: false,
            ndiActive: false,
            useNDI5: false,
            useCustomResolution: false,
            customWidthNDI: -1,
            customHeightNDI: -1,
        })
        return { ndiActive, useNDI5, useCustomResolution, customWidthNDI, customHeightNDI }
    }

    async updateNDIConfig(ndiActive: boolean, useNDI5: boolean, useCustomResolution: boolean, customWidthNDI: number = -1, customHeightNDI: number = -1): Promise<void> {
        await this.apiClient.ndiConfig({
            setNewConfig: true,
            ndiActive,
            useNDI5,
            useCustomResolution,
            customWidthNDI,
            customHeightNDI,
        })
    }
}
