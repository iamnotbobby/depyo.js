const {PycReader} = require('./lib/PycReader');
const fs = require('fs');

global.g_cliArgs = {debug: false};

if (process.argv.length < 3) {
    console.log("Usage: node dump_bytecode.js <file.pyc>");
    process.exit(1);
}

const filename = process.argv[2];
try {
    const reader = new PycReader(filename);
    const ver = reader.m_version || {major: '?', minor: '?'};
    console.log(`Python ${ver.major}.${ver.minor}`);
    console.log("===================================");

    const obj = reader.ReadObject();
    console.log(`Object Type: ${obj.ClassName}`);

    let code = null;
    if (obj.ClassName === 'Py_CodeObject') {
        code = obj;
    } else if (obj.Value && obj.Value.ClassName === 'Py_CodeObject') {
        code = obj.Value;
    }

    if (!code) {
        console.log("Failed to read code object (not a Py_CodeObject)");
        return;
    }

    dumpCodeObject(code, reader, "Main Module");

} catch (e) {
    console.error("Error:", e.message);
    console.error(e.stack);
}

function dumpCodeObject(code, reader, prefix) {
    console.log(`\n--- ${prefix}: ${code.Name} ---`);
    printInstructions(code, reader);

    let constsArray = Array.isArray(code.Consts) ? code.Consts : (code.Consts && code.Consts.Value ? code.Consts.Value : []);
    
    for (let i = 0; i < constsArray.length; i++) {
        const c = constsArray[i];
        if (c && c.ClassName === 'Py_CodeObject') {
            dumpCodeObject(c, reader, `${prefix} -> Const ${i}`);
        }
    }
}

function printInstructions(codeObj, reader) {
    try {
        if (codeObj.VarNames) {
             let vars = codeObj.VarNames.Value || codeObj.VarNames;
             if (Array.isArray(vars)) {
                 vars = vars.map(v => v.toString ? v.toString() : v);
             }
             console.log("  VarNames:", vars);
        }
        if (codeObj.CellVars) {
             let vars = codeObj.CellVars.Value || codeObj.CellVars;
             if (Array.isArray(vars)) {
                 vars = vars.map(v => v.toString ? v.toString() : v);
             }
             console.log("  CellVars:", vars);
        }
        if (codeObj.FreeVars) {
             let vars = codeObj.FreeVars.Value || codeObj.FreeVars;
             if (Array.isArray(vars)) {
                 vars = vars.map(v => v.toString ? v.toString() : v);
             }
             console.log("  FreeVars:", vars);
        }
        if (codeObj.Names) {
             let vars = codeObj.Names.Value || codeObj.Names;
             if (Array.isArray(vars)) {
                 vars = vars.map(v => v.toString ? v.toString() : v);
             }
             console.log("  Names:", vars);
        }
        const OpCodeClass = reader.OpCodes;
        if (!OpCodeClass) {
            console.log("  No opcode handler for this version");
            return;
        }
        const codeIter = new OpCodeClass(codeObj);
        
        while (codeIter.HasInstructionsToProcess) {
            codeIter.GoNext();
            const instr = codeIter.Current;
            let arg = instr.HasArgument ? ` (arg=${instr.Argument})` : '';
            let offset = String(instr.Offset).padStart(4, ' ');
            let name = instr.InstructionName.padEnd(30, ' ');
            console.log(`  ${offset}: ${name}${arg}`);
        }
    } catch (ex) {
        console.log("  Error: " + ex.message);
    }
}

