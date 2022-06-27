"use strict"

const interactive = () => {
	console.log("interactive mode entered, rest of params ignored")
	process.stdin.pipe(process.stdout)
}

const processParams = (params) => {
	console.log(params)
	if (params[0] === "-i") interactive()
}

const run = () => {
	const argvCount = process.argv.length - 2;
	if (argvCount < 1) {
		console.log(`usage:\n\n\tsome instructions are here`)
		// TODO: add tests for exit status
		process.exit(1)
	}
	processParams(process.argv.slice(2, process.argv.length))
}

run()

