"use strict"

const os = require('os')
const { spawnSync } = require('child_process');
const { statSync } = require('fs');

const interactiveHelpObject = {
	title: "Help",
	message: "Available commands: help, system, user, directory, details, exit"
}

const scriptHelpObject = {
	title: "Usage",
	message: "node [command] # any of: help, system, user, directory, details, exit"
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
	const commonlyIgnoredFileNames = [",node_modules", ".", ","] // Quick fix
	const rawFileList = spawnSync("ls").output.toString().split('\n')
	return rawFileList.filter(filename => !commonlyIgnoredFileNames.includes(filename))
}

const getFileStats = (name) => {
	try {
		const stats = statSync(name)
		return stats
	} catch(error) {
		console.log("Something went wrong, double check with \"directory\"")
	}
}

const commandProcessor = (command) => {
	switch (command[0]) {
		case "help":
			console.log(JSON.stringify(interactiveHelpObject))
			break
		case "system":
			console.log(JSON.stringify(getSystemInfoObject()))
			break
		case "user":
			console.log(JSON.stringify(getUserInfoObject()))
			break
		case "directory":
			console.log(JSON.stringify(getFilteredFileListObject()))
			break
		case "details":
			console.log(JSON.stringify(getFileStats(command[1])))
			break
		case "exit":
			process.exit(0)
		default:
			console.log("unrecognized command")
			break
	}
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
