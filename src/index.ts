import bind from "bind-decorator"
import { canvasCoordsToVector, generateID, mountObserver, pickRan } from "./helpers"
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
import { WallComponent } from "./Component/wall"

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

	private walls: [string, WallComponent][]

	constructor()
	{
		this.physicalSystem = new PhysicalSystem()

		this.collisionSystem = new CollisionSystem( this.physicalSystem )

		this.audioSystem = new AudioSystem()

		this.inputSystem = new InputSystem()

		this.inputSystem.stringObservable.subscribe( {
			next: inputID =>
			{
				const playerCount = this.player.length + 1

				this.createPlayer( inputID, playerCount )

				for ( const component of this.components )
				{
					if ( component instanceof InputSelect )
					{
						component.setPlayer( playerCount )
					}
				}
			}
		} )

		this.inputSystem.inputStateObservable.subscribe( {
			next: state =>
			{
				if ( state === `ready` ) this.generateEntities()

				for ( const component of this.components )
				{
					if ( component instanceof InputSelect )
					{
						component.next( state )
					}
				}
			}
		} )

		this.components = []

		this.player = []

		this.sequencer = []

		this.capsule = []

		this.walls = []

		this.entities = {}

		mountObserver.subscribe( { next: this.loadComponent } )

		this.logSystem = new LogSystem()

		loadUI()
	}

	@bind
	private loadComponent<T>( component: T )
	{
		this.logSystem.next( { level: `info`, message: `Got component: ${component}` } )

		if (
			component instanceof InputSelect
			|| component instanceof GameCanvas
			|| component instanceof ViewRender )
		{
			this.components.push( component )

			if ( component instanceof InputSelect )
			{
				component.inputModeObservable.subscribe( {
					next: mode =>
					{
						this.audioSystem.init()

						this.inputSystem.init( mode )

						this.components.forEach( c =>
							c instanceof GameCanvas && c.init() )
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

	private createPlayer( inputID: string, playerCount: number )
	{
		const id = generateID()

		const player = new PlayerComponent( inputID, playerCount )

		this.entities[ id ] = player

		this.emitEntity( id, player )

		this.player.push( [ id, player ] )
	}

	private createCapsule()
	{
		const capsuleID = generateID()

		const sequencerID = generateID()

		const capsule = new CapsuleComponent( sequencerID )

		this.entities[ capsuleID ] = capsule

		this.emitEntity( capsuleID, capsule )

		this.capsule.push( [ capsuleID, capsule ] )

		this.createSequencer( capsuleID, sequencerID )
	}

	private createSequencer( capsuleID: string, sequencerID: string )
	{
		const types: SoundType[] = [ `beat`, `synth` ]

		const sequencer = new SequencerComponent( capsuleID, pickRan( types ) )
		
		this.entities[ sequencerID ] = sequencer

		this.emitEntity( sequencerID, sequencer )

		this.sequencer.push( [ sequencerID, sequencer ] )
	}

	private generateEntities()
	{
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

	private emitEntity( id: string, instance: Component )
	{
		this.physicalSystem.next( { id, instance } )

		this.collisionSystem.next( { id, instance } )

		this.inputSystem.next( { id, instance } )

		this.audioSystem.next( { id, instance } )
	}

	private generateWalls( ctx: CanvasRenderingContext2D )
	{
		if ( this.walls.length > 0 ) return

		const { width: w, height: h } = ctx.canvas

		for ( let i = 0; i < w; )
		{
			const posTop = canvasCoordsToVector( ctx.canvas, { left: i, top: 0 } )	

			const wallTop = new WallComponent( posTop )

			this.setWall( wallTop )

			const posBase = canvasCoordsToVector( ctx.canvas, { left: i, top: h } )	

			const wallBase = new WallComponent( posBase )
			
			this.setWall( wallBase )

			i += wallTop.radius * 2
		}

		for ( let i = 0; i < h; )
		{
			const posLeft = canvasCoordsToVector( ctx.canvas, { left: 0, top: i } )	

			const wallLeft = new WallComponent( posLeft )

			this.setWall( wallLeft )

			const posRight = canvasCoordsToVector( ctx.canvas, { left: w, top: i } )	

			const wallRight = new WallComponent( posRight )
			
			this.setWall( wallRight )

			i += wallLeft.radius * 2
		}
	}

	private setWall( wall: WallComponent )
	{
		const wallID = generateID()
	
		this.entities[ wallID ] = wall

		this.emitEntity( wallID, wall )

		this.walls.push( [ wallID, wall ] )
	}

	private update( delta: number, ctx: CanvasRenderingContext2D )
	{
		this.generateWalls( ctx )

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