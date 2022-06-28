"use strict"

const { spawn } = require("child_process");
const tap = require("tap")
const stream = require("stream")

tap.test("script mode tests", t => {
	t.test("given an empty command, shows help message that contains \"Usage\" and exits", t => {
		const child = spawn("node", ["../sys-info.js"], { cwd: __dirname })
		child.stdout.on("data", data => t.match(data.toString(), /Usage/, "must show usage message"))
		child.on("close", () => t.end())
	})
	t.test("given good command, outputs dir data and exits", t => {
		const child = spawn("node", ["../sys-info.js", "directory"], { cwd: __dirname })
		child.stdout.on("data", data => t.doesNotThrow(() => JSON.parse(data.toString()).length, 
			"output should parse to array of strings with dir contents"))
		child.on("close", () => t.end())
	})
	t.test("given a bad command, \"unrecognized command\" is output and process exits", t => {
		const child = spawn("node", ["../sys-info.js", "bla"], { cwd: __dirname })
		child.stdout.on("data", data => t.match(data.toString(), /unrecognized command/, "must indicate bad usage"))
		child.on("close", () => t.end())
	})
	t.end()
})

tap.test("interactive mode tests", t => {
	t.test("given \"-i\" flag, interactive mode is launched", t => {
		const child = spawn("node", ["../sys-info.js", "-i"], { cwd: __dirname })
		const commandTests = [
			// { genExp: //, message: "", nextCommand: "\n" },
			{ genExp: /(type|cpu|hostname|platform)/, message: "must get system info", nextCommand: "exit\n" },
			{ genExp: /interactive mode/, message: "must enter interactive mode", nextCommand: "system\n" }
		]
		child.stdout.on("data", data => {
			const { genExp, message, nextCommand } = commandTests.pop()
			t.match(data.toString(), genExp, message)
			child.stdin.write(nextCommand)
		})
		child.on("close", () => t.end())
	})
	t.test("given good command, output buffer gets data")
	t.end()
})

