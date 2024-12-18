let functions = ["sin", "!", "logbase"]

function ev(data, constants, expression) {
    let tmpConstants = {}
    for (let x of Object.keys(constants)) {
        tmpConstants["["+x+"]"] = constants[x]
    }
    constants = tmpConstants

    let postfix = infix(expression)
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
                } else { // Function
                    if (x === "!") {
                        let num = stack.pop()
                        let result = 1
                        for (let x = 1; x <= num; x++) result *= x
                        stack.push(result)
                    }
                    if (x === "logbase") {
                        let a = parseFloat(stack.pop())
                        let b = parseFloat(stack.pop())
                        stack.push(Math.log(a)/Math.log(b))
                    }
                    if (x === "sin") {
                        let a = parseFloat(stack.pop())
                        stack.push(Math.sin(a))
                    }

                }
            }
        } else {
            stack.push(x)
        }
    }
    return stack.pop()
}

function infix(exp) {
    let infix = []
    let current = ""
    for (let x of (exp+" ")) {
        if (/\d/g.test(x)) current += x
        else if (x === "." && current.trim().length === 0)  {
            current = "0."
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
        if (functions.includes(x)) return 0
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
                    while (true) {
                        if (precedence(stack[stack.length - 1]) >= precedence(x)) postfix.push(stack.pop())
                        else break
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

let x = ev([],[], "5 sin + 2")
console.log("5 sin + 2")
console.log(x)

//let x1 = ev({"x": 3, "pi": 17}, {"pi": Math.PI}, "20 20 logbase")
//console.log(x1) // 13