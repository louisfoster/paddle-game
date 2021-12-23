import { SubscriberHandler } from "./subscriberHandler"

export function el<T extends HTMLElement | SVGElement>( selector: string, root?: HTMLElement | Document | ShadowRoot | DocumentFragment ): T
{
	const el = ( root ?? document ).querySelector<T>( selector )

	if ( !el ) throw Error( `No element ${selector}` )

	return el
}

export function using<T, V>( results: T | undefined | null )
{
	return {
		do: ( fn: ( results: T ) => V ) =>
		{
			if ( results !== undefined && results !== null )
				return fn( results )
		}
	}
}

export function def( tag: string )
{
	return {
		do: ( fn: () => void ) =>
		{
			customElements
				.whenDefined( tag )
				.then( fn )
		}
	}
}

export function listen<T extends ( HTMLElement | Document | SVGElement )>( element: T )
{
	return {
		on: <K extends keyof EventExtended>( type: K ) =>
			( {
				do: ( listener: ( ( event: EventExtended[K] ) => void ) ) =>
				{
					element.addEventListener(
						type as keyof GlobalEventHandlersEventMap,
						listener as ( event: GlobalEventHandlersEventMap[keyof GlobalEventHandlersEventMap] ) => void )

					return () => element.removeEventListener(
						type as keyof GlobalEventHandlersEventMap,
						listener as ( event: GlobalEventHandlersEventMap[keyof GlobalEventHandlersEventMap] ) => void  )
				}
			} )
	}
}

export function whenTrue( test: boolean )
{
	const notTrue = ( fallback: () => void ) => fallback()

	return {
		do<T>( fn: () => T ) 
		{
			const results = ( withResults: ( results: T ) => void ) =>
			{
				const res = test ? fn() : undefined

				if ( res ) withResults( res )

				return { notTrue }
			}

			return {
				results,
				notTrue
			}
		}
	}
}

export const mountObserver = new SubscriberHandler()

export function componentMount<T>( instance: T )
{
	mountObserver.next( instance )
}

export async function loadJSON<T>( path: string ): Promise<T>
{
	return await fetch( path ).then( data => data.json() )
}

export async function loadHTML( path: string ): Promise<string>
{
	return await fetch( path ).then( data => data.text() )
}

export function bound( value: number )
{
	return Math.max( 0, Math.min( 1, value ) )
}

export function vectorToCanvasCoords( canvas: HTMLCanvasElement, vector: Vector ): CanvasCoords
{
	return {
		left: vector.x * canvas.width,
		top: vector.y * canvas.height
	}
}

export function canvasCoordsToVector( canvas: HTMLCanvasElement, coords: CanvasCoords ): Vector
{
	return {
		x: coords.left / canvas.width,
		y: coords.top / canvas.height
	}
}

export function randomPosition(): Vector
{
	return {
		x: Math.random(),
		y: Math.random()
	}
}

// https://www.geeksforgeeks.org/check-two-given-circles-touch-intersect/
export function doTwoCirclesIntersect( x1: number, y1: number, r1: number, x2: number, y2: number, r2: number )
{
	const distSq = ( x1 - x2 ) * ( x1 - x2 ) + ( y1 - y2 ) * ( y1 - y2 )

	const radSumSq = ( r1 + r2 ) * ( r1 + r2 )

	return !( distSq > radSumSq )
}

export function ranIdx<T>( arr: T[] ): number
{
	return ~~( Math.random() * arr.length )
}

export function pickRan<T>( arr: T[] ): T
{
	return arr[ ranIdx( arr ) ]
}

export function generateID()
{
	return `${~~( Math.random() * 10000 )}`
}