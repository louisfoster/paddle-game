import { ComponentBase } from "../componentBase"
import { define } from "web-component-decorator"
import { using, el, listen } from "../helpers"
import { SubscriberHandler } from "../subscriberHandler"
import type { PlayerLoader } from "./playerLoader"

enum Stage
{
	start = `start`,
	loading = `loading`,
	players = `players`,
	error = `error`,
}

@define( `input-select` )
export class InputSelect extends ComponentBase implements InputModeObservable, Observer<InputState>
{
	public inputModeObservable: SubscriberHandler<InputMode>

	private stages?: Record<Stage, HTMLDivElement>

	private playerLoaders: PlayerLoader[]

	constructor() 
	{
		super( `input-select` )

		this.inputModeObservable = new SubscriberHandler()

		this.playerLoaders = []
	}

	private emit( mode: InputMode )
	{
		this.setStage( Stage.loading )
		
		this.inputModeObservable.next( mode )
	}

	private setStage( stage: Stage )
	{
		if ( !this.stages ) return

		for ( const s in this.stages )
		{
			const _s = this.stages[ s as Stage ]

			if ( s !== stage && _s.classList.contains( `active` ) )
				_s.classList.remove( `active` )

			else if ( s === stage && !_s.classList.contains( `active` ) )
				_s.classList.add( `active` )	
		}
	}

	connectedCallback(): void 
	{
		using( this.shadowRoot )
			.do( root =>
			{
				this.stages = {
					start: el( `[data-stage=start]`, root ),
					loading: el( `[data-stage=loading]`, root ),
					players: el( `[data-stage=players]`, root ),
					error: el( `[data-stage=error]`, root ),
				}

				root.querySelectorAll<PlayerLoader>( `player-loader` ).forEach( item => this.playerLoaders.push( item ) )

				const k = el( `#keyboard`, root )
     
				listen( k ).on( `click` ).do( () => this.emit( `keyboard` ) )

				const c = el( `#controller`, root )

				if ( navigator.serial )
				{
					c.removeAttribute( `disabled` )

					c.removeAttribute( `title` )
     
					listen( c ).on( `click` ).do( () => this.emit( `controller` ) )
				}
			} )	
	}

	next( state: InputState )
	{
		if ( !this.stages ) return

		switch( state )
		{
			case `error`:

				this.setStage( Stage.error )

				break

			case `player-select`:

				this.setStage( Stage.players )

				break

			case `init`:

				this.setStage( Stage.start )

				break

			case `ready`:

				this.remove()

				break
		}
	}

	public setPlayer( playerCount: number )
	{
		this.playerLoaders[ playerCount - 1 ].update( `hsl(${70 * playerCount}, 100%, 53%, 1)` )
	}
}