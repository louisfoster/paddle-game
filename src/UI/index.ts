import "./viewRender"
import "./gameCanvas"
import "./inputSelect"

export function loadUI()
{
	const main = document.createElement( `main` )

	main.innerHTML = `
	<view-render>
		<game-canvas></game-canvas>
	</view-render>
	`

	document.body.appendChild( main )
}