import { ComponentBase } from "../componentBase"
import { define } from "web-component-decorator"
import { el, using } from "../helpers"
import { PlayerComponent } from "../Component/player"
import { CapsuleComponent } from "../Component/capsule"
import { PhysicalSystem } from "../System/physical"
import { CollisionSystem } from "../System/collision"
import { InputSystem } from "../System/input"
import { SequencerComponent } from "../Component/sequencer"
import { AudioSystem } from "../System/audio"



/**
 * - collision: player bouncing off walls, other chars, occupied capsules
 * - capsule drawing, occupying
 * - varying size notes
 * - reset note count for path on resize
 */

@define( `game-canvas` )
export class GameCanvas extends ComponentBase
{
	private state: {
		previousTime: number
	}

	private ctx?: CanvasRenderingContext2D

	private player: [string, PlayerComponent][]

	private capsule: [string, CapsuleComponent][]

	private sequencer: [string, SequencerComponent][]

	private entities: Record<string, Component>

	private physicalSystem: PhysicalSystem

	private collisionSystem: CollisionSystem

	private inputSystem: InputSystem

	private audioSystem: AudioSystem

	constructor() 
	{
		super( `game-canvas` )

		this.physicalSystem = new PhysicalSystem()

		this.collisionSystem = new CollisionSystem( this.physicalSystem )

		this.inputSystem = new InputSystem()

		this.audioSystem = new AudioSystem()

		this.player = []

		this.sequencer = []

		this.capsule = []

		this.entities = {}

		this.state = {
			previousTime: 0
		}

		this.generateEntities()
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

	private init( canvas: HTMLCanvasElement )
	{
		this.ctx = this.getCtx( canvas )

		this.state.previousTime = performance.now()

		this.render( this.state.previousTime, this.ctx )
	}

	private getCtx( canvas: HTMLCanvasElement )
	{
		const ctx = canvas.getContext( `2d` )

		if ( !ctx ) throw `No rendering context`

		return ctx
	}

	private render( time: number, ctx: CanvasRenderingContext2D )
	{
		const delta = time - this.state.previousTime

		const canvas = ctx.canvas

		this.setWH( canvas )

		ctx.fillStyle = `#000`

		ctx.fillRect( 0, 0, canvas.width, canvas.height )

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

		this.state.previousTime = time

		requestAnimationFrame( ( time ) => this.render( time, ctx ) )
	}

	private setWH( canvas: HTMLCanvasElement )
	{
		const { width, height } = canvas.getBoundingClientRect()

		if ( canvas.width === width && canvas.height === height ) return

		canvas.width = width

		canvas.height = height
	}

	connectedCallback(): void 
	{
		using( this.shadowRoot )
			.do( root => this.init( el( `canvas`, root ) ) )	
	}
}