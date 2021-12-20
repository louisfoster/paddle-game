import bind from "bind-decorator"
import { mountObserver } from "./helpers"
import { LogSystem } from "./logSystem"
import { loadUI } from "./UI"
import { GameCanvas } from "./UI/gameCanvas"
import { InputSelect } from "./UI/inputSelect"
import { ViewRender } from "./UI/viewRender"
import { PhysicalSystem } from "./System/physical"
import { CollisionSystem } from "./System/collision"
import { InputSystem } from "./System/input"
import { AudioSystem } from "./System/audio"
import { PlayerComponent } from "./Component/player"
import { CapsuleComponent } from "./Component/capsule"
import { SequencerComponent } from "./Component/sequencer"

type UIComponent = InputSelect | GameCanvas | ViewRender

class Main
{
	public static run()
	{
		new Main()
	}

	private logSystem: LogSystem

	private components: UIComponent[]

	private physicalSystem: PhysicalSystem

	private collisionSystem: CollisionSystem

	private inputSystem: InputSystem

	private audioSystem: AudioSystem

	private player: [string, PlayerComponent][]

	private capsule: [string, CapsuleComponent][]

	private sequencer: [string, SequencerComponent][]

	private entities: Record<string, Component>

	constructor()
	{

		this.physicalSystem = new PhysicalSystem()

		this.collisionSystem = new CollisionSystem( this.physicalSystem )

		this.inputSystem = new InputSystem()

		this.audioSystem = new AudioSystem()

		this.components = []

		this.player = []

		this.sequencer = []

		this.capsule = []

		this.entities = {}

		mountObserver.subscribe( { next: this.loadComponent } )

		this.logSystem = new LogSystem()

		loadUI()
	}

	@bind
	private loadComponent<T>( component: T )
	{
		this.logSystem.next( { level: `info`, message: `Got component: ${component}` } )

		if ( component instanceof InputSelect || component instanceof GameCanvas || component instanceof ViewRender )
		{
			this.components.push( component )

			if ( component instanceof InputSelect )
			{
				component.inputModeObservable.subscribe( {
					next: mode =>
					{
						this.audioSystem.init()

						this.inputSystem.init( mode )

						this.components.forEach( c => c instanceof GameCanvas && c.init() )

						this.generateEntities()
					}
				} )
			}

			if ( component instanceof GameCanvas )
			{
				component.updateLoopObservable.subscribe( {
					next: ( { ctx, delta } ) => this.update( delta, ctx )
				} )
			}
		}
	}

	private createPlayer()
	{
		const id = this.generateID()

		const player = new PlayerComponent()

		this.entities[ id ] = player

		this.emitEntity( id, player )

		this.player.push( [ id, player ] )
	}

	private createCapsule()
	{
		const capsuleID = this.generateID()

		const capsule = new CapsuleComponent()

		this.entities[ capsuleID ] = capsule

		this.emitEntity( capsuleID, capsule )

		this.capsule.push( [ capsuleID, capsule ] )

		this.createSequencer( capsuleID )

	}

	private createSequencer( capsuleID: string )
	{
		const sequencerID = this.generateID()

		const sequencer = new SequencerComponent( capsuleID )
		
		this.entities[ sequencerID ] = sequencer

		this.emitEntity( sequencerID, sequencer )

		this.sequencer.push( [ sequencerID, sequencer ] )
	}

	private generateEntities()
	{
		this.createPlayer()

		let count = 0

		setTimeout( () =>
		{
			this.createCapsule()

			count += 1
		}, 100 )

		const int = setInterval( () =>
		{
			this.createCapsule()

			count += 1

			if ( count === 7 ) clearInterval( int )
		}, 1000 )
	}

	private generateID()
	{
		return `${~~( Math.random() * 10000 )}`
	}

	private emitEntity( id: string, instance: Component )
	{
		this.physicalSystem.next( { id, instance } )

		this.collisionSystem.next( { id, instance } )

		this.inputSystem.next( { id, instance } )

		this.audioSystem.next( { id, instance } )
	}

	private update( delta: number, ctx: CanvasRenderingContext2D )
	{
		this.inputSystem.update()

		this.physicalSystem.update( delta, ctx )

		this.collisionSystem.update( ctx )

		for( const sequencer of this.sequencer )
		{
			sequencer[ 1 ].draw( ctx )
		}

		for( const player of this.player )
		{
			player[ 1 ].draw( ctx, this.physicalSystem.pos( player[ 0 ] ) )
		}

		for( const capsule of this.capsule )
		{
			capsule[ 1 ].draw( ctx, this.physicalSystem.pos( capsule[ 0 ] ) )
		}
	}
}

Main.run()