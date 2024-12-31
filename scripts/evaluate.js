// Position 1 for after, otherwise assumed to be default
let functions = {
    logbase: {
        func: (a) => Math.log(a[1])/Math.log(a[0])
    },
    "factorial": {
        func: (a) => {
            let result = 1
            for (let x = 1; x <= a[0]; x++) result *= x
            return result
        }
    },
    //#region Math.* functions
    abs: {
        func: (a) => Math.abs(a[0])
    },
    acos: {
        func: (a) => Math.acos(a[0])
    },
    acosh: {
        func: (a) => Math.acosh(a[0])
    },
    asin: {
        func: (a) => Math.asin(a[0])
    },
    asinh: {
        func: (a) => Math.asinh(a[0])
    },
    atan: {
        func: (a) => Math.atan(a[0])
    },
    atan2: {
        func: (a) => Math.atan2(a[0], a[1])
    },
    atanh: {
        func: (a) => Math.atanh(a[0])
    },
    cbrt: {
        func: (a) => Math.cbrt(a[0])
    },
    ceil: {
        func: (a) => Math.ceil(a[0])
    },
    cos: {
        func: (a) => Math.cos(a[0])
    },
    cosh: {
        func: (a) => Math.cosh(a[0])
    },
    exp: {
        func: (a) => Math.exp(a[0])
    },
    expm1: {
        func: (a) => Math.expm1(a[0])
    },
    floor: {
        func: (a) => Math.floor(a[0])
    },
    fround: {
        func: (a) => Math.fround(a[0])
    },
    hypot: {
        func: (a) => Math.hypot(...a)
    },
    imul: {
        func: (a) => Math.imul(a[0], a[1])
    },
    log: {
        func: (a) => Math.log(a[0])
    },
    log10: {
        func: (a) => Math.log10(a[0])
    },
    log1p: {
        func: (a) => Math.log1p(a[0])
    },
    log2: {
        func: (a) => Math.log2(a[0])
    },
    max: {
        func: (a) => Math.max(...a)
    },
    min: {
        func: (a) => Math.min(...a)
    },
    pow: {
        func: (a) => Math.pow(a[0], a[1])
    },
    random: {
        func: () => Math.random()
    },
    round: {
        func: (a) => Math.round(a[0])
    },
    sign: {
        func: (a) => Math.sign(a[0])
    },
    sin: {
        func: (a) => Math.sin(a[0])
    },
    sinh: {
        func: (a) => Math.sinh(a[0])
    },
    sqrt: {
        func: (a) => Math.sqrt(a[0])
    },
    tan: {
        func: (a) => Math.tan(a[0])
    },
    tanh: {
        func: (a) => Math.tanh(a[0])
    },
    trunc: {
        func: (a) => Math.trunc(a[0])
    },
    //#endregion

}

/**
 * Idea: when theres a function, find the parameters, then evaluate each of those parameters individually
 * Then, replace that function with the evaluated value.
 *
 * So the chain of events would be like:
 * logbase(1+1,2*2*2*2) + 2 * 5
 * logbase(2,16) + 2 * 5
 * 4 + 2 * 5
 * solve
 **/

function ev(data, constants, expression) {
    let tmpConstants = {}
    for (let x of Object.keys(constants)) {
        tmpConstants["["+x+"]"] = constants[x]
    }
    constants = tmpConstants

    let postfix = toPostfix(expression)
    //console.log(postfix)
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
                if (Object.keys(data).includes(x)) {
                    postfix[i] = data[x]
                    i--
                } else if (Object.keys(constants).includes(x)) {
                    postfix[i] = constants[x]
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

function evaluate(data, constants, exp) {
    let deepness = 0
    let beginIndex
    let endIndex

    let index = 0

    let finalExp = exp

    let item = ""
    let outerFunction = false

    while (finalExp.includes("(") && index <= finalExp.length) {
        if (finalExp[index] === "(") {
            deepness++
            beginIndex = index
            if (Object.keys(functions).includes(item.trim())) outerFunction = item
            else outerFunction = false
            item = ""
        }
        else if (finalExp[index] === ")") {
            endIndex = index

            beginIndex++

            if (outerFunction) {
                let params = []
                for (let x of finalExp.substring(beginIndex,endIndex).split(","))
                    params.push(parseFloat(ev(data,constants,x)))
                console.log(params)
                let simplified = ev(data, constants, functions[outerFunction.trim()].func(params))
                finalExp = finalExp.substring(0, beginIndex-1 - outerFunction.length) + simplified + finalExp.substring(endIndex+1, finalExp.length)
            } else {
                let simplified = ev(data, constants, finalExp.substring(beginIndex,endIndex))
                finalExp = finalExp.substring(0, beginIndex-1) + simplified + finalExp.substring(endIndex+1, finalExp.length)
            }
            index = -1
            item = ""

            deepness = 0
        } else {
            if (item === "" || (isNaN(parseFloat(item)) === isNaN(finalExp[index])))
                item += finalExp[index]
            else item = ""
        }
        index++
    }
    return ev(data, constants, finalExp)
}

let exp = "tan(2)"
let x = evaluate({},{}, exp)
console.log(exp)
console.log(x)

//let x1 = ev({"x": 3, "pi": 17}, {"pi": Math.PI}, "20 20 logbase")
//console.log(x1) // 13

// Todo: variables with spaces in their names