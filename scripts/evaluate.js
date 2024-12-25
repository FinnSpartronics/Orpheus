// Position 1 for after, otherwise assumed to be default
let functions = {
    logbase: {
        params: 2,
        func: (base,x) => Math.log(base)/Math.log(x)
    },
    "!": {
        params: 1,
        position: 1,
        func: (a) => {
            let result = 1
            for (let x = 1; x <= a; x++) result *= x
            return result
        }
    },
    "factorial": {
        params: 1,
        func: (a) => {
            let result = 1
            for (let x = 1; x <= a; x++) result *= x
            return result
        }
    },
    //#region Math. functions
    abs: {
        params: 1,
        func: (a) => Math.abs(a)
    },
    acos: {
        params: 1,
        func: (a) => Math.acos(a)
    },
    acosh: {
        params: 1,
        func: (a) => Math.acosh(a)
    },
    asin: {
        params: 1,
        func: (a) => Math.asin(a)
    },
    asinh: {
        params: 1,
        func: (a) => Math.asinh(a)
    },
    atan: {
        params: 1,
        func: (a) => Math.atan(a)
    },
    atan2: {
        params: 2,
        func: (a, b) => Math.atan2(a, b)
    },
    atanh: {
        params: 1,
        func: (a) => Math.atanh(a)
    },
    cbrt: {
        params: 1,
        func: (a) => Math.cbrt(a)
    },
    ceil: {
        params: 1,
        func: (a) => Math.ceil(a)
    },
    clz32: {
        params: 1,
        func: (a) => Math.clz32(a)
    },
    cos: {
        params: 1,
        func: (a) => Math.cos(a)
    },
    cosh: {
        params: 1,
        func: (a) => Math.cosh(a)
    },
    exp: {
        params: 1,
        func: (a) => Math.exp(a)
    },
    expm1: {
        params: 1,
        func: (a) => Math.expm1(a)
    },
    floor: {
        params: 1,
        func: (a) => Math.floor(a)
    },
    fround: {
        params: 1,
        func: (a) => Math.fround(a)
    },
    hypot: {
        params: 2,
        func: (a, b) => Math.hypot(a, b)
    },
    imul: {
        params: 2,
        func: (a, b) => Math.imul(a, b)
    },
    log: {
        params: 1,
        func: (a) => Math.log(a)
    },
    log1p: {
        params: 1,
        func: (a) => Math.log1p(a)
    },
    log2: {
        params: 1,
        func: (a) => Math.log2(a)
    },
    log10: {
        params: 1,
        func: (a) => Math.log10(a)
    },
    max: {
        params: 2,
        func: (a, b) => Math.max(a, b)
    },
    min: {
        params: 2,
        func: (a, b) => Math.min(a, b)
    },
    pow: {
        params: 2,
        func: (a, b) => Math.pow(a, b)
    },
    random: {
        params: 0,
        func: () => Math.random()
    },
    round: {
        params: 1,
        func: (a) => Math.round(a)
    },
    sign: {
        params: 1,
        func: (a) => Math.sign(a)
    },
    sin: {
        params: 1,
        func: (a) => Math.sin(a)
    },
    sinh: {
        params: 1,
        func: (a) => Math.sinh(a)
    },
    sqrt: {
        params: 1,
        func: (a) => Math.sqrt(a)
    },
    tan: {
        params: 1,
        func: (a) => Math.tan(a)
    },
    tanh: {
        params: 1,
        func: (a) => Math.tanh(a)
    },
    trunc: {
        params: 1,
        func: (a) => Math.trunc(a)
    },
    //#endregion
}

function ev(data, constants, expression) {
    let tmpConstants = {}
    for (let x of Object.keys(constants)) {
        tmpConstants["["+x+"]"] = constants[x]
    }
    constants = tmpConstants

    let postfix = toInfix(expression)
    //console.log(postfix)
    let stack = []
    let fStack
    for (let i = 0; i < postfix.length; i++) {
        let x = postfix[i]
        if (isNaN(parseFloat(x))) {
            if (x.match(/[+\-*/^%]/g)) {
                let a = parseFloat(stack.pop())
                let b = parseFloat(stack.pop())
                if (x === "+") stack.push(b+a)
                if (x === "-") stack.push(b-a)
                if (x === "*") stack.push(b*a)
                if (x === "/") stack.push(b/a)
                if (x === "^") stack.push(Math.pow(b,a))
                if (x === "%") stack.push(b%a)
            } else {
                if (Object.keys(data).includes(x)) {
                    postfix[i] = data[x]
                    i--
                } else if (Object.keys(constants).includes(x)) {
                    postfix[i] = constants[x]
                    i--
                } else { // Function
                    if (Object.keys(functions).includes(x)) {
                        if (functions[x].position === 1) {
                            console.log(JSON.stringify(stack), x)
                            if (functions[x].params === 1) {
                                stack.push(functions[x].func(stack.pop()))
                            } else if (functions[x].params === 2) {
                                let a = stack.pop()
                                let b = stack.pop()
                                stack.push(functions[x].func(b, a))
                            }
                            else alert("Function has too many params")
                        } else {
                            fStack = {
                                func: functions[x].func,
                                params: functions[x].params,
                                stack: []
                            }
                        }
                    } else {
                        // Throw an error?
                    }
                }
            }
        } else {
            if (fStack !== undefined) {
                if (fStack.params === fStack.stack.length) {
                    if (fStack.params === 1) {
                        stack.push(fStack.func(fStack.stack.pop()))
                        fStack = undefined
                        i--
                    }
                    else if (fStack.params === 2) {
                        let b = fStack.stack.pop()
                        stack.push(fStack.func(b, fStack.stack.pop()))
                        fStack = undefined
                        i --
                    } else alert("too many parameters")
                } else fStack.stack.push(x)
            }
            else stack.push(x)
        }
    }
    if (fStack !== undefined) {
        if (fStack.params === 1) {
            stack.push(fStack.func(fStack.stack.pop()))
            fStack = undefined
        }
        else if (fStack.params === 2) {
            let b = fStack.stack.pop()
            stack.push(fStack.func(b, fStack.stack.pop()))
            fStack = undefined
        } else alert("too many parameters")
    }
    //console.log(stack.length)
    return stack.pop()
}

function toInfix(exp) {
    let infix = []
    let current = ""
    for (let x of (exp+" ")) {
        if (/\d/g.test(x)) current += x
        else if (x === "." && current.trim().length === 0)  {
            current = "0."
        }
        else if (x.trim() === ",") {
            infix.push(current)
            current = ""
        }
        else if (/[+\-*/^%()!]/g.test(x)) {
            if (current.trim() !== "")
                infix.push(current)
            infix.push(x)
            current = ""
        }
        else if (x === " " && current.trim() !== "") {
            if (infix.length > 0) {
                let regex = /[a-z]|[A-Z]/g
                if (regex.test(infix[infix.length - 1].replaceAll(/[\[,\]]/g, "")) && regex.test(current.replaceAll(/[\[,\]]/g, ""))) {
                    infix[infix.length - 1] += " " + current
                }
                else infix.push(current)
            } else infix.push(current)
            current = ""
        }
        else if (x !== " ") current += x
    }

    function precedence(x) {
        if (Object.keys(functions).includes(x)) return 0
        switch(x) {
            case "+":
            case "-": return 1
            case "*":
            case "/":
            case "%": return 2
            default: return 3
        }
    }

    let stack = []
    let postfix = []

    for (let x of infix) {
        if (/[+\-*/^%()]/g.test(x)) {
            if (x === "(") stack.push("(")
            if (x === ")") {
                while (true) {
                    let a = stack.pop()
                    if (a !== "(") postfix.push(a)
                    else break
                }
            } else {
                if (stack.length === 0) stack.push(x)
                else if (stack.includes("(")) stack.push(x)
                else if (precedence(stack[stack.length - 1]) < precedence(x)) stack.push(x)
                else {
                    while (precedence(stack[stack.length - 1]) >= precedence(x) && stack.length > 0) {
                        postfix.push(stack.pop())
                    }
                    stack.push(x)
                }
            }
        } else {
            postfix.push(x)
        }
    }
    while (stack.length > 0) {
        let x = stack.pop()
        if (x !== "(")
            postfix.push(x)
    }

    return postfix
}

let x = ev([],[], "logbase(2,16)!+4") //4! = 24
console.log(x)

//let x1 = ev({"x": 3, "pi": 17}, {"pi": Math.PI}, "20 20 logbase")
//console.log(x1) // 13
