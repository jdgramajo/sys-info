"use strict"

const os = require('os')
const { statSync, readdirSync, mkdirSync, writeFileSync } = require('fs')

const interactiveHelpObject = {
	title: "Help",
	message: "Available commands: help, system, user, directory, details {file}, exit"
		+ "\n\n-s as last param to save output to a file under the info directory"
}

const scriptHelpObject = {
	title: "Usage",
	message: "node [command] # any of: help, system, user, directory, details {file}, exit"
	  + "\n\n-i for interactive mode, will ignore the rest of them"
	  + "\n\n-s as last param to save output to a file under the info directory"
}

const getSystemInfoObject = () => {
	return {
		type: os.type(),
		architecture: os.arch(),
		hostname: os.hostname(),
		platform: os.platform(),
		cpus: os.cpus().length,
		totalmem: `${os.totalmem()/(1024*1024*1024)}GB`,
		uptime: os.uptime()
	}
}

const getUserInfoObject = () => os.userInfo()

const getFilteredFileListObject = () => {
	const commonlyIgnoredFileNames = [ "node_modules", ".git", ".nyc_output" ] // Quick fix
	const rawFileList = readdirSync(__dirname)

	return rawFileList.filter(filename => !commonlyIgnoredFileNames.includes(filename)
		&& !__filename.includes(filename))
}

const getFileStats = (name) => {
	try {
		const stats = statSync(name)
		return stats
	} catch(error) {
		return { error, hint: "Something went wrong, double check with \"directory\"" }
	}
}

const commandProcessor = (command) => {

	let commandOutput = ""

	switch (command[0]) {
		case "help":
			commandOutput = JSON.stringify(interactiveHelpObject)
			break
		case "system":
			commandOutput = JSON.stringify(getSystemInfoObject())
			break
		case "user":
			commandOutput = JSON.stringify(getUserInfoObject())
			break
		case "directory":
			commandOutput = JSON.stringify(getFilteredFileListObject())
			break
		case "details":
			commandOutput = JSON.stringify(getFileStats(command[1]))
			break
		case "exit":
			process.exit(0)
		default:
			commandOutput = "unrecognized command"
			break
	}

	if (command.slice(-1).toString() === "-s") {
		mkdirSync("./info")
		writeFileSync(`./info/${command[0]}.json`, commandOutput)
		commandOutput = `./info/${command[0]}.json file created/updated`
	}

	console.log(commandOutput)
}

const processParams = (params) => {
	if (params[0] === "-i") {
		console.log("Entered the interactive mode, rest of params will be ignored.")
		process.stdin.on("data", data => commandProcessor(data.toString().trim().split(' ')))
		return
	}

	commandProcessor(params)
}

const run = () => {

	const argvCount = process.argv.length - 2

	if (argvCount < 1) {
		console.log(JSON.stringify(scriptHelpObject))
		// TODO: add tests for exit status
		process.exit(1)
	}

	processParams(process.argv.slice(2, process.argv.length))
}

run()
