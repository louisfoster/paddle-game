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
