"use strict"

const { spawn } = require("child_process");
const tap = require("tap")
const { readdirSync, readFileSync, existsSync, renameSync, mkdirSync, writeFileSync, rmSync, rmdirSync } = require("fs")
const { resolve } = require("path")

tap.before(() => {
	const infoDirExists = existsSync(resolve(__dirname, "..", "info"))
	if (infoDirExists) renameSync(resolve(__dirname, "..", "info"), resolve(__dirname, "..", "test-backup"))
	mkdirSync(resolve(__dirname, "..", "info")), { recursive: true }
	for (let option of [ "system", "user", "directory" ]) {
		writeFileSync(resolve(__dirname, "..", "info", `${option}.json`), option)
	}
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
				t.match(data.toString(), /(type|architecture|hostname|platform|cpus)/, "must output that file named as the command was created")
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
				t.match(data.toString(), /(WRONG_OPTION|unrecognized display option: h)/, "must output that file named as the command was created")
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
			{ genExp: /.*/, message: "must output info", nextCommand: "exit\n" },
			{ genExp: /.*/, message: "must output info", nextCommand: "display\n" }, // after re creating empty dir
			{ genExp: /.*/, message: "must output info", nextCommand: "display\n" }, // after deleting info dir
			{ genExp: /(atime|mtime|ctime|birthtime)/, message: "must output file stats", nextCommand: "display\n" },
			{ genExp: /(error|hint)/, message: "must output error message & hint", nextCommand: `details ${__filename}\n` },
			{ genExp: /\[/, message: "must output a dir member array", nextCommand: "details badname\n" },
			{ genExp: /(uid|gid|username|homedir|shell)/, message: "must get user info", nextCommand: "directory\n" },
			{ genExp: /(type|cpu|hostname|platform)/, message: "must get system info", nextCommand: "user\n" },
			{ genExp: /(title|message)/, message: "must dispay help", nextCommand: "system\n" },
			{ genExp: /interactive mode/, message: "must enter interactive mode", nextCommand: "help\n" }
		]

		// First output does not count, but last call should. Balanced, as everything should be.
		const commandTestCount = commandTests.length
		let childDataEventCount = 0

		child.stdout.on("data", data => {
			childDataEventCount++
			const { genExp, message, nextCommand } = commandTests.pop()
			t.match(data.toString(), genExp, message)
			child.stdin.write(nextCommand)
			if (nextCommand === "display\n") {
				// deletes the directory after first display call
				if (existsSync(resolve(__dirname, "..", "info"))) {
					rmdirSync(resolve(__dirname, "..", "info"), { recursive: true, force: true })
				} else {
					mkdirSync(resolve(__dirname, "..", "info"))
				}
			}
		})

		child.on("close", () => {
			t.ok(childDataEventCount === commandTestCount,
				`child process should output ${commandTests.length} times, did ${childDataEventCount}`)
			t.end()
		})
	})

	t.end()

})

tap.teardown(() => {
	if (existsSync(resolve(__dirname, "..", "info"))) rmdirSync(resolve(__dirname, "..", "info"), 
		{ recursive: true, force: true })
	renameSync(resolve(__dirname, "..", "test-backup"), resolve(__dirname, "..", "info"))
})
