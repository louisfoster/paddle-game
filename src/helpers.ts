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

export function listen<T extends ( HTMLElement | Document )>( element: T )
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
