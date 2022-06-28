"use strict"

const { spawn } = require("child_process");
const tap = require("tap")
const stream = require("stream")

tap.test("script mode tests", t => {
	t.test("given an empty command", t => {
		const child = spawn("node", ["../sys-info.js"], { cwd: __dirname })
		child.stdout.on("data", data => t.match(data.toString(), /Usage/, "must show usage message"))
		child.on("close", () => t.end())
	})
	t.test("given good command", t => {
		const child = spawn("node", ["../sys-info.js", "directory"], { cwd: __dirname })
		child.stdout.on("data", data => t.doesNotThrow(() => JSON.parse(data.toString()).length, 
			"output should parse to an array of strings with dir contents"))
		child.on("close", () => t.end())
	})
	t.test("given a bad command", t => {
		const child = spawn("node", ["../sys-info.js", "bla"], { cwd: __dirname })
		child.stdout.on("data", data => t.match(data.toString(), /unrecognized command/, "must indicate bad usage"))
		child.on("close", () => t.end())
	})
	t.end()
})

tap.test("interactive mode tests", t => {
	t.test("given \"-i\" flag, interactive mode is launched, within it:", t => {
		const child = spawn("node", ["../sys-info.js", "-i"], { cwd: __dirname })
		const commandTests = [
			{ genExp: /(atime|mtime|ctime|birthtime)/, message: "must output file stats", nextCommand: "exit\n" },
			{ genExp: /(error|hint)/, message: "must output error message & hint", nextCommand: `details ${__filename}\n` },
			{ genExp: /\[.*\]/, message: "must output a dir member array", nextCommand: "details badname\n" },
			{ genExp: /(uid|gid|username|homedir|shell)/, message: "must get user info", nextCommand: "directory\n" },
			{ genExp: /(type|cpu|hostname|platform)/, message: "must get system info", nextCommand: "user\n" },
			{ genExp: /(title|message)/, message: "must dispay help", nextCommand: "system\n" },
			{ genExp: /interactive mode/, message: "must enter interactive mode", nextCommand: "help\n" }
		]
		child.stdout.on("data", data => {
			const { genExp, message, nextCommand } = commandTests.pop()
			t.match(data.toString(), genExp, message)
			child.stdin.write(nextCommand)
		})
		child.on("close", () => t.end())
	})
	t.end()
})

