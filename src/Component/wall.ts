export class WallComponent implements Wall
{
	constructor( public initialPosition: Vector )
	{}

	get radius(): number
	{
		return 10
	}
}