import bind from "bind-decorator"
import { mountObserver } from "./helpers"
import { LogSystem } from "./logSystem"
import { loadUI } from "./UI"

class Main
{
	public static run()
	{
		new Main()
	}

	private logSystem: LogSystem

	constructor()
	{
		mountObserver.subscribe( { next: this.loadComponent } )

		this.logSystem = new LogSystem()

		loadUI()
	}

	@bind
	private loadComponent<T>( component: T )
	{
		this.logSystem.next( { level: `info`, message: `Got component: ${component}` } )
	}
}

Main.run()