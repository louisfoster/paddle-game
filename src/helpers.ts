import { SubscriberHandler } from "./subscriberHandler"

/**
 * Get an element from a provided DOM/node tree
 * @param selector 
 * @param root 
 * @returns 
 */
export function el<T extends HTMLElement | SVGElement>( selector: string, root?: HTMLElement | Document | ShadowRoot | DocumentFragment ): T
{
	const el = ( root ?? document ).querySelector<T>( selector )

	if ( !el ) throw Error( `No element ${selector}` )

	return el
}

/**
 * "defined" filter for value to be passed to a function 
 * @param results 
 * @returns 
 */
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

/**
 * alias function for running when custom elements are defined
 * @param tag 
 * @returns 
 */
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

/**
 * addEventListener alias
 * @param element 
 * @returns 
 */
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

/**
 * Run function on not true, with fallback
 * @param test 
 * @returns 
 */
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

/**
 * UI mount system observable
 */
export const mountObserver = new SubscriberHandler()

export function componentMount<T>( instance: T )
{
	mountObserver.next( instance )
}

/**
 * Limit a value to 0 - 1
 * @param value 
 * @returns 
 */
export function bound( value: number )
{
	return Math.max( 0, Math.min( 1, value ) )
}

/**
 * Using a given canvas, get the left / top coordinates using a given unit vector
 * @param canvas 
 * @param vector 
 * @returns 
 */
export function vectorToCanvasCoords( canvas: HTMLCanvasElement, vector: Vector ): CanvasCoords
{
	return {
		left: vector.x * canvas.width,
		top: vector.y * canvas.height
	}
}

/**
 * Using a given canvas, get the unit vector from given left/top coordinates
 * @param canvas 
 * @param coords 
 * @returns 
 */
export function canvasCoordsToVector( canvas: HTMLCanvasElement, coords: CanvasCoords ): Vector
{
	return {
		x: coords.left / canvas.width,
		y: coords.top / canvas.height
	}
}

/**
 * A random unit vector generator
 * @returns 
 */
export function randomPosition(): Vector
{
	return {
		x: Math.random(),
		y: Math.random()
	}
}

/**
 * Checks if two circles intersect based on their coordinates/vector and radius
 * note: makes sure they both use the same unit of measurement
 * From https://www.geeksforgeeks.org/check-two-given-circles-touch-intersect/
 * @returns 
 */

export function doTwoCirclesIntersect( x1: number, y1: number, r1: number, x2: number, y2: number, r2: number )
{
	const distSq = ( x1 - x2 ) * ( x1 - x2 ) + ( y1 - y2 ) * ( y1 - y2 )

	const radSumSq = ( r1 + r2 ) * ( r1 + r2 )

	return !( distSq > radSumSq )
}

/**
 * Get a random index for an array
 * @param arr 
 * @returns 
 */
export function ranIdx<T>( arr: T[] ): number
{
	return ~~( Math.random() * arr.length )
}

/**
 * Get a random element from an array
 * @param arr 
 * @returns 
 */
export function pickRan<T>( arr: T[] ): T
{
	return arr[ ranIdx( arr ) ]
}

/**
 * A (simple and not "secure") random ID generator
 * @returns 
 */
export function generateID()
{
	return `${~~( Math.random() * 10000 )}`
}

/**
 * pixel distance between two points on a canvas
 * from: https://stackoverflow.com/questions/26540823/find-the-length-of-line-in-canvas
 * @param point1 
 * @param point2 
 * @returns 
 */
export function lineDistance( point1: CanvasCoords, point2: CanvasCoords )
{
	return Math.sqrt(
		Math.pow( point2.left - point1.left, 2 ) 
		+ Math.pow( point2.top - point1.top, 2 ) )
}

/**
 * coordinates interpolated between points A and B, with magnitude between 0 and 1
 * from : https://stackoverflow.com/questions/17190981/how-can-i-interpolate-between-2-points-when-drawing-with-canvas/17191557
 * @param a 
 * @param b 
 * @param frac 
 * @returns 
 */
export function interpolate( a: CanvasCoords, b: CanvasCoords, frac: number ): CanvasCoords
{
	return {
		left: a.left + ( b.left - a.left  ) * frac,
		top: a.top + ( b.top - a.top ) * frac
	}
}

// colors for use in components
export const colors = {
	[ `light-coral` ]: `hsla(0, 86%, 77%, 1)`,
	[ `aquamarine` ]: `hsla(150, 86%, 77%, 1)`,
	[ `violet-web` ]: `hsla(300, 86%, 77%, 1)`,
	[ `space-cadet` ]: `hsla(238, 30%, 19%, 1)`,
	[ `mint-green` ]: `hsla(98, 86%, 77%, 1)`,
	[ `deep-champagne` ]: `hsla(35, 86%, 77%, 1)`,
	[ `french-sky-blue` ]: `hsla(220, 86%, 77%, 1)`,
	[ `light-green` ]: `hsla(127, 86%, 77%, 1)`,
}