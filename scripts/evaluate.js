let functions = {
    logbase: (a) => Math.log(a[1])/Math.log(a[0]),
    factorial: (a) => {
        let result = 1;
        for (let x = 1; x <= a[0]; x++) result *= x;
        return result;
    },
    //#region Math. functions
    abs: (a) => Math.abs(a[0]),
    acos: (a) => Math.acos(a[0]),
    acosh: (a) => Math.acosh(a[0]),
    asin: (a) => Math.asin(a[0]),
    asinh: (a) => Math.asinh(a[0]),
    atan: (a) => Math.atan(a[0]),
    atan2: (a) => Math.atan2(a[0], a[1]),
    atanh: (a) => Math.atanh(a[0]),
    cbrt: (a) => Math.cbrt(a[0]),
    ceil: (a) => Math.ceil(a[0]),
    cos: (a) => Math.cos(a[0]),
    cosh: (a) => Math.cosh(a[0]),
    exp: (a) => Math.exp(a[0]),
    expm1: (a) => Math.expm1(a[0]),
    floor: (a) => Math.floor(a[0]),
    fround: (a) => Math.fround(a[0]),
    hypot: (a) => Math.hypot(...a),
    imul: (a) => Math.imul(a[0], a[1]),
    log: (a) => Math.log(a[0]),
    log10: (a) => Math.log10(a[0]),
    log1p: (a) => Math.log1p(a[0]),
    log2: (a) => Math.log2(a[0]),
    max: (a) => Math.max(...a),
    min: (a) => Math.min(...a),
    pow: (a) => Math.pow(a[0], a[1]),
    random: () => Math.random(),
    round: (a) => Math.round(a[0]),
    sign: (a) => Math.sign(a[0]),
    sin: (a) => Math.sin(a[0]),
    sinh: (a) => Math.sinh(a[0]),
    sqrt: (a) => Math.sqrt(a[0]),
    tan: (a) => Math.tan(a[0]),
    tanh: (a) => Math.tanh(a[0]),
    trunc: (a) => Math.trunc(a[0]),
    //#endregion
    //#region Logic
    equal: (a) => {
        if (isNaN(parseFloat(a[0]))) {
            return (""+a[0]).replaceAll("'","") == (""+a[1]).replaceAll("'","") ? 1 : 0;
        }
        return a[0] == a[1] ? 1 : 0;
    },
    equals: (a) => {
        if (isNaN(parseFloat(a[0]))) {
            return (""+a[0]).replaceAll("'","") == (""+a[1]).replaceAll("'","") ? 1 : 0;
        }
        return a[0] == a[1] ? 1 : 0;
    },
    greater: (a) => a[0] > a[1] ? 1 : 0,
    "greater=": (a) => a[0] >= a[1] ? 1 : 0,
    less: (a) => a[0] < a[1] ? 1 : 0,
    "less=": (a) => a[0] <= a[1] ? 1 : 0,
    or: (a) => a[0] + a[1] > 0 ? 1 : 0,
    and: (a) => a[0] + a[1] === 2 ? 1 : 0,
    not: (a) => a[0] == 0 ? 1 : 0,
    "if": (a) => {
        if (a[0]) return a[1];
        if (a[2] === undefined) return 0;
        return a[2];
    }
    //#endregion
}

function ev(data, constants, expression) {
    let tmpVars = {}
    for (let x of Object.keys(data)) {
        if (data[x] === "") data[x] = 0
        tmpVars["["+x+"]"] = data[x]
    }
    let variables = tmpVars

    let postfix = toPostfix(expression)
    //console.log(postfix, variables)
    let stack = []
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
                if (Object.keys(constants).includes(x)) {
                    postfix[i] = constants[x]
                    i--
                } else if (Object.keys(variables).includes(x)) {
                    postfix[i] = variables[x]
                    i--
                }
            }
        } else {
            stack.push(x)
        }
    }
    return stack.pop()
}

function toPostfix(exp) {
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
            if (current.trim() !== "") {
                infix.push(current)
            }
            infix.push(x)
            current = ""
        }
        else if (x === " " && current.trim() !== "") {
            if (infix.length > 0) {
                let regex = /[a-z]|[A-Z]/g
                if (regex.test(infix[infix.length - 1].replaceAll(/[\[,\]]/g, "")) && regex.test(current.replaceAll(/[\[,\]]/g, ""))) {
                    infix[infix.length - 1] += " " + current
                }
                else {
                    infix.push(current)
                }
            } else {
                infix.push(current)
            }
            current = ""
        }
        else if (x !== " ") current += x
    }

    // Convert all -x to (0-x)

    function precedence(x) {
        switch(x) {
            case "+":
            case "-": return 1
            case "*":
            case "/":
            case "%": return 2
            case "^": return 3
            default: return -1
        }
    }

    let stack = []
    let postfix = []

    for (let x of infix) {
        if (/[+\-*/^%()]/g.test(x)) {
            if (x === "(") stack.push(x)
            else if (x === ")") {
                while (stack[stack.length - 1] !== "(") {
                    postfix.push(stack.pop())
                }
                stack.pop()
            }
            else {
                while (stack.length > 0 && (precedence(x) <= precedence(stack[stack.length-1]))) {
                    let x = stack.pop()
                    if (x !== "(") postfix.push(x)
                }
                stack.push(x)
            }
        } else postfix.push(x)
    }
    while (stack.length > 0) {
        let x = stack.pop()
        if (x !== "(")
            postfix.push(x)
    }

    return postfix
}

function evaluate(data, constants, exp) {
    let deepness = 0
    let beginIndex
    let endIndex

    let index = 0

    let finalExp = exp

    let item = ""
    let outerFunction = false

    let inQuotes = false

    while (finalExp.includes("(") && index <= finalExp.length) {
        if (finalExp[index] === "(" && !inQuotes) {
            deepness++
            beginIndex = index
            if (Object.keys(functions).includes(item.trim())) outerFunction = item
            else outerFunction = false
            item = ""
        }
        else if (finalExp[index] === ")" && !inQuotes) {
            endIndex = index

            beginIndex++

            if (outerFunction) {
                let params = []
                for (let x of finalExp.substring(beginIndex,endIndex).split(",")) {
                    if (isNaN(parseFloat(ev(data,constants,x)))) {
                        let tmpVars = {}
                        for (let x of Object.keys(data)) {
                            if (data[x] === "") data[x] = 0
                            tmpVars["["+x+"]"] = data[x]
                        }
                        let variables = tmpVars
                        if (Object.keys(constants).includes(x)) {
                            x = constants[x]
                        } else if (Object.keys(variables).includes(x)) {
                            x = variables[x]
                        }
                        params.push(x)
                    }
                    else params.push(parseFloat(ev(data,constants,x)))
                }
                let simplified = ev(data, constants, functions[outerFunction.trim()](params))
                finalExp = finalExp.substring(0, beginIndex-1 - outerFunction.length) + simplified + finalExp.substring(endIndex+1, finalExp.length)
            } else {
                let simplified = ev(data, constants, finalExp.substring(beginIndex,endIndex))
                finalExp = finalExp.substring(0, beginIndex-1) + simplified + finalExp.substring(endIndex+1, finalExp.length)
            }
            index = -1
            item = ""
            inQuotes = false

            deepness = 0
        }
        else if (finalExp[index] === "'") inQuotes = !inQuotes
        else {
            if (item === "" || (isNaN(parseFloat(item)) === isNaN(finalExp[index])))
                item += finalExp[index]
            else item = ""
        }
        index++
    }
    return parseFloat(ev(data, constants, finalExp))
}

// Todo: Fix stuff breaking when doing -num instead 0-num
