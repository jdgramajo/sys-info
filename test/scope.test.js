"use strict"

const tap = require("tap")

tap.test("can run as script", t => {
	t.todo("shows a message starting with usage: if no params are passed")
})

tap.test("can parse and process params", t => {
	t.test("when params are passed, they get stored to an array")
	t.test("a FIRST -i param will trigger interactive mode (event logger???)")
})

tap.test("can capture input when interactive", t => {
	t.todo("pipes stdin and saves commands to an array, displays arrays contents")
})


