interface Observer<T>
{
	next?: (data: T) => void
	completed?: () => void
}

/* LOGGING */

interface LogObservable
{
	readonly logObservable: {
		subscribe(logObserver: Observer<Log>): void
	}
}

type LogLevel = `info` | `warn` | `error`

interface Log
{
	level: LogLevel
	message: string
}



/* APP VIEW */

interface AppViewObservable
{
	readonly appViewObservable: {
		subscribe(appViewObserver: Observer<View>): void
	}
}

type AppView = `home`


/* STRING */

interface StringObservable
{
	readonly stringObservable: {
		subscribe(stringObserver: Observer<string>): void
	}
}


/* MODE */


interface ModeObservable
{
	readonly modeObservable: {
		subscribe(modeObserver: Observer<Mode>): void
	}
}

interface Mode
{
	name: string
	mode: string
}


/* EMIT */

interface EmitObservable
{
	readonly emitObservable: {
		subscribe(emitObserver: Observer<void>): void
	}
}


/* EventExtended */

interface EventExtended extends GlobalEventHandlersEventMap
{
	//
}


/* InputMode */


interface InputModeObservable
{
	readonly inputModeObservable: {
		subscribe(inputModeObserver: Observer<InputMode>): void
	}
}

type InputMode = `keyboard` | `controller`


/* UpdateLoop */


interface UpdateLoopObservable
{
	readonly updateLoopObservable: {
		subscribe(updateLoopObserver: Observer<UpdateLoop>): void
	}
}

interface UpdateLoop
{
	delta: number
	ctx: CanvasRenderingContext2D
}


/* EmitInputState */


interface InputStateObservable
{
	readonly inputStateObservable: {
		subscribe(inputStateObserver: Observer<InputState>): void
	}
}

type InputState = `init` | `error` | `player-select` | `ready`


interface Vector
{
	x: number
	y: number
}

interface CanvasCoords
{
	left: number
	top: number
}

interface Drawable
{
	draw(ctx: CanvasRenderingContext2D, pos: Vector): void
}

interface Physical
{
	initialPosition: Vector
}

interface Collidable extends Physical
{
	radius: number
}

interface Player extends Collidable
{
	rotation: number
	acceleration: number
	inCapsule: string
	inputID: string
	state: `normal` | `ejecting` | `bounce`
}

interface Capsule extends Collidable
{
	moving: `pre` | `active` | `end` | `sequence`
	occupiedBy: string
}

interface Wall extends Collidable
{
	
}

type SoundType = `beat` | `synth`

interface Circle extends Vector
{
	active: boolean
	note: Frequency
	length: string
	type: SoundType
}

interface Sequencer
{
	fromCapsule: string
	audio(): Circle | undefined
}

type Component = Player | Capsule | Sequencer | Wall

interface ComponentEntity
{
	id: string
	instance: Component
}