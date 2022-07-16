"use strict"

const os = require("os")
const { existsSync, statSync, readdirSync, mkdirSync, writeFileSync, readFileSync } = require("fs")
const { resolve } = require("path")

const interactiveHelpObject = {
	title: "Help",
	message: "Available commands: help, system, user, directory, details {file}, exit"
		+ "\n\n-s as last param to save output to a file under the info directory"
}

const scriptHelpObject = {
	title: "Usage",
	message: "node [command] # any of: help, system, user, directory, details {file}, display {info letter}, exit"
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
	} catch (error) {
		return { type: "FILE_ERROR", hint: `${error.message}: check with "directory"` }
	}
}

const getExistingInfo = (option) => {
	const getInfo = filename => {
		try {
			const jsonObj = JSON.parse(readFileSync(filename).toString())
			return jsonObj
		} catch (error) {
			return { type: "JSON_PARSING_ERROR", hint: error.message }
		}
	}
	switch (option) {
		case "s":
			return getInfo(resolve(__dirname, "info/system.json"))
		case "u":
			return getInfo(resolve(__dirname, "info/user.json"))
		case "d":
			return getInfo(resolve(__dirname, "info/directory.json"))
		default:
			if (option) return { type: "WRONG_OPTION", hint: `unrecognized display option: ${option}` }
			if (existsSync("./info")) {
				const fileList = readdirSync("./info")
				return fileList.length > 0 ?
					fileList.reduce((acc, curr) => readFileSync(`./info/${curr}`) + acc, "") :
					{ type: "EMPTY_INFO_DIR", hint: "generate some info, directory empty" }
			}
			return { type: "INFO_DIR_NOT_FOUND", hint: "generate some info, directory does not exist" }
	}
}

const commandProcessor = (command) => {

	let result

	switch (command[0]) {
		case "help":
			result = interactiveHelpObject
			break
		case "system":
			result = getSystemInfoObject()
			break
		case "user":
			result = getUserInfoObject()
			break
		case "directory":
			result = getFilteredFileListObject()
			break
		case "details":
			result = getFileStats(command[1])
			break
		case "display":
			result = getExistingInfo(command[1])
			break
		case "exit":
			process.stdin.removeAllListeners("data")
			process.exit(0)
		default:
			result = { type: "ERROR_MESSAGE", message: "unrecognized command" }
			break
	}

	if (command.slice(-1).toString() === "-s") {
		mkdirSync("./info", { recursive: true })
		writeFileSync(`./info/${command[0]}.json`, JSON.stringify(result))
		result = `./info/${command[0]}.json file created/updated`
	}

	console.log(result)
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
		process.exit(1)
	}

	processParams(process.argv.slice(2, process.argv.length))
}

run()
