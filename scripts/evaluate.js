function ev(data, constants, expression) {
    let tmpConstants = {}
    for (let x of Object.keys(constants)) {
        tmpConstants["["+x+"]"] = constants[x]
    }
    constants = tmpConstants

    // Step 1: Infix to Postfix


    // Step 2: Evaluate
    let postfix = expression.split(" ")
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
                    
                }
            }
        } else {
            stack.push(x)
        }
    }
    return stack.pop()
}

//let x = ev([], [], "2 + 2 * 4")
//console.log(x) // 2 2 4 * +

let x1 = ev({"x": 3, "pi": 17}, {"pi": Math.PI}, "20 20 logbase")
console.log(x1) // 13