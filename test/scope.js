"use strict"

const { spawn } = require("child_process")
const tap = require("tap")
const { readdirSync, readFileSync, existsSync, renameSync, mkdirSync, writeFileSync, rmSync } = require("fs")
const { resolve } = require("path")

tap.before(() => {
	const infoDirExists = existsSync(resolve(__dirname, "..", "info"))
	if (infoDirExists) renameSync(resolve(__dirname, "..", "info"), resolve(__dirname, "..", "test-backup"))
	mkdirSync(resolve(__dirname, "..", "info")), { recursive: true }
})

tap.test("script mode tests", t => {
	t.test("given an empty command", t => {

		let dataEventEmitted = false
		const child = spawn("node", ["sys-info.js"], { cwd: resolve(__dirname, '..') })

		child.stdout.on("data", data => {
			dataEventEmitted = true
			t.match(data.toString(), /(title|Usage|message)/, "must show usage message")
			t.notSame(child.exitCode, 0, "exit code must be different to 0")
		})

		child.on("close", () => {
			t.ok(dataEventEmitted, "stdout should emit data")
			t.end()
		})
	})

	t.test("given good command", t => {
		let dataEventEmitted = false
		const child = spawn("node", ["sys-info.js", "directory"], { cwd: resolve(__dirname, '..') })

		child.stdout.on("data", data => {
			dataEventEmitted = true
			const dataObj = JSON.parse(data.toString().replaceAll("\'", "\""))
			t.same(typeof dataObj, "object",
				"output should parse to a valid JSON after replacing single with double quotes")
		})

		child.on("close", () => {
			t.ok(dataEventEmitted, "stdout should emit data")
			t.end()
		})
	})

	t.test("given a bad command", t => {

		let dataEventEmitted = false
		const child = spawn("node", ["sys-info.js", "bla"], { cwd: resolve(__dirname, '..') })

		child.stdout.on("data", data => {
			dataEventEmitted = true
			t.match(data.toString(), /unrecognized command/, "must indicate bad usage")
		})

		child.on("close", () => {
			t.ok(dataEventEmitted, "stdout should emit data")
			t.end()
		})
	})

	t.test("when outputing commands end with the \"-s\" flag", t => {
		let dataEventEmitted = false
		const child = spawn("node", ["sys-info.js", "system", "-s"], { cwd: resolve(__dirname, '..') })

		child.stdout.on("data", data => {
			dataEventEmitted = true
			t.doesNotThrow(() => readdirSync("info"), "info directory must exist or have been created")
			t.doesNotThrow(() => readFileSync("info/system.json"), "must create output file, with the name of the command")
			t.match(data.toString(), /(system|created|updated)/, "must output that file named as the command was created")
		})

		child.on("close", () => {
			t.ok(dataEventEmitted, "stdout should emit data")
			t.end()
		})
	})

	t.test("\"display\" command tests", async t => {
		t.test("with a valid option specified", t => {
			let dataEventEmitted = false
			const child = spawn("node", ["sys-info.js", "display", "s"], { cwd: resolve(__dirname, '..') })

			child.stdout.on("data", data => {
				dataEventEmitted = true
				t.match(data.toString(), /(type|architecture|hostname|platform|cpus)/,
					"must output that file named as the command was created")
			})

			child.on("close", () => {
				t.ok(dataEventEmitted, "stdout should emit data")
				t.end()
			})
		})

		t.test("with a invalid option specified, it outputs an error message", t => {
			let dataEventEmitted = false
			const child = spawn("node", ["sys-info.js", "display", "x"], { cwd: resolve(__dirname, '..') })

			child.stdout.on("data", data => {
				dataEventEmitted = true
				t.match(data.toString(), /(WRONG_OPTION|unrecognized display option: h)/,
					"must output that file named as the command was created")
			})

			child.on("close", () => {
				t.ok(dataEventEmitted, "stdout should emit data")
				t.end()
			})
		})

		t.end()

	})

	t.end()

})

tap.test("interactive mode tests", t => {

	t.test("given \"-i\" flag, interactive mode is launched, within it:", t => {

		const child = spawn("node", ["sys-info.js", "-i"], { cwd: resolve(__dirname, '..') })
		const commandTests = [
			{ genExp: /interactive mode/, message: "must enter interactive mode", nextCommand: "help\n" },
			{ genExp: /(title|message)/, message: "must dispay help", nextCommand: "system\n" },
			{ genExp: /(type|cpu|hostname|platform)/, message: "must get system info", nextCommand: "user\n" },
			{ genExp: /(uid|gid|username|homedir|shell)/, message: "must get user info", nextCommand: "directory\n" },
			{ genExp: /\[/, message: "must output a dir member array", nextCommand: "system -s\n" },
			{ genExp: /(file created)/, message: "should create/update a file", nextCommand: "user -s\n" },
			{ genExp: /(file created)/, message: "should create/update a file", nextCommand: "directory -s\n" },
			{ genExp: /(file created)/, message: "should create/update a file", nextCommand: "details badname\n" },
			{ genExp: /(type|hint)/, message: "must output error message & hint", nextCommand: `details ${__filename}\n` },
			{ genExp: /(atime|mtime|ctime|birthtime)/, message: "must output file stats", nextCommand: "display s\n" },
			{ genExp: /(type|cpu|hostname|platform)/, message: "must output user info", nextCommand: "display u\n" },
			{ genExp: /(uid|gid|username|homedir|shell)/, message: "must output system info", nextCommand: "display d\n" },
			{ genExp: /\[/, message: "must output directory info", nextCommand: "display\n" }, // info dir deleted after
			{ genExp: /(type|cpu|username|shell|\[)/, message: "must output all info files", nextCommand: "display\n" },
			{ genExp: /(type|hint|EMPTY_INFO_DIR)/, message: "must output all info files", nextCommand: "display\n" },
			{ genExp: /(type|hint|JSON_PARSE_ERROR)/, message: "must output JSON_PARSE_ERROR", nextCommand: "display s\n" },
			{ genExp: /(type|hint)/, message: "must output error message & hint", nextCommand: "exit\n" },
		]

		// First output does not count, but last call should. Balanced, as everything should be.
		const commandTestCount = commandTests.length
		let childDataEventCount = 0

		child.stdout.on("data", data => {
			const { genExp, message, nextCommand } = commandTests[childDataEventCount++]
			t.match(data.toString(), genExp, message)
			child.stdin.write(nextCommand)
			if (nextCommand === "display\n") {
				// deletes the directory after first display call
				if (existsSync(resolve(__dirname, "..", "info"))) {
					rmSync(resolve(__dirname, "..", "info"), { recursive: true, force: true })
				} else {
					// creates an empty directory for test coverage, after 2nd call
					mkdirSync(resolve(__dirname, "..", "info"))
				}
			}
		})

		child.on("close", () => {
			t.ok(childDataEventCount === commandTestCount,
				`child process should output ${commandTestCount} times, did ${childDataEventCount}`)
			t.end()
		})
	})

	t.end()

})

tap.teardown(() => {
	if (existsSync(resolve(__dirname, "..", "info"))) rmSync(resolve(__dirname, "..", "info"), 
		{ recursive: true, force: true })
	if (existsSync(resolve(__dirname, "..", "test-backup"))) renameSync(resolve(__dirname, "..", "test-backup"),
		resolve(__dirname, "..", "info"))
})

