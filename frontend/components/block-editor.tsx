"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { ProgramBlock } from "@/lib/types";

export function BlockEditor() {
  const editorRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<any>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let disposed = false;
    async function initBlockly() {
      const Blockly = await import("blockly");
      defineRobotBlocks(Blockly);
      if (editorRef.current && !workspaceRef.current && !disposed) {
        workspaceRef.current = Blockly.inject(editorRef.current, {
          toolbox: {
            kind: "categoryToolbox",
            contents: [
              { kind: "category", name: "Motion", colour: "#4C97AF", contents: [
                { kind: "block", type: "robot_move_to" }, { kind: "block", type: "robot_move_relative" },
                { kind: "block", type: "robot_home" }, { kind: "block", type: "robot_set_speed" },
              ]},
              { kind: "category", name: "Gripper", colour: "#5BA55B", contents: [
                { kind: "block", type: "robot_vacuum_on" }, { kind: "block", type: "robot_vacuum_off" },
              ]},
              { kind: "category", name: "Flow", colour: "#A55BA5", contents: [
                { kind: "block", type: "robot_repeat" }, { kind: "block", type: "robot_wait" },
              ]},
              { kind: "category", name: "I/O", colour: "#A5745B", contents: [
                { kind: "block", type: "robot_log" },
              ]},
            ],
          },
        });
      }
    }
    initBlockly();
    return () => { disposed = true; if (workspaceRef.current) { workspaceRef.current.dispose(); workspaceRef.current = null; } };
  }, []);

  function getProgram(): ProgramBlock[] {
    if (!workspaceRef.current) return [];
    const Blockly = require("blockly");
    return workspaceToProgram(Blockly, workspaceRef.current);
  }

  async function handleRun() {
    const program = getProgram();
    if (program.length === 0) return;
    setRunning(true);
    try { await api.runScript(program); } catch (error) { alert(error instanceof Error ? error.message : "Run failed"); }
  }

  async function handleStop() { await api.stopScript(); setRunning(false); }

  async function handleExportPython() {
    const program = getProgram();
    if (program.length === 0) return;
    const result = await api.exportPython(program);
    const blob = new Blob([result.script], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "robot_program.py"; anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card-panel overflow-hidden">
      <div className="card-panel-header">
        <h3 className="text-sm font-semibold text-gray-700">Block Editor</h3>
        <div className="flex gap-2">
          {running ? (
            <button className="btn-danger text-xs" onClick={handleStop}>Stop</button>
          ) : (
            <button className="btn-success text-xs" onClick={handleRun}>Run</button>
          )}
          <button className="btn-secondary text-xs" onClick={handleExportPython}>Export Python</button>
        </div>
      </div>
      <div ref={editorRef} className="w-full h-[500px]" />
    </div>
  );
}

function defineRobotBlocks(Blockly: any) {
  const blocks: Record<string, any> = {
    robot_move_to: { init() { this.appendDummyInput().appendField("Move To X").appendField(new Blockly.FieldNumber(0), "X").appendField("Y").appendField(new Blockly.FieldNumber(0), "Y").appendField("Z").appendField(new Blockly.FieldNumber(80), "Z").appendField("Speed").appendField(new Blockly.FieldNumber(100), "SPEED"); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour(190); }},
    robot_move_relative: { init() { this.appendDummyInput().appendField("Move Rel dX").appendField(new Blockly.FieldNumber(0), "DX").appendField("dY").appendField(new Blockly.FieldNumber(0), "DY").appendField("dZ").appendField(new Blockly.FieldNumber(0), "DZ").appendField("Speed").appendField(new Blockly.FieldNumber(50), "SPEED"); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour(190); }},
    robot_home: { init() { this.appendDummyInput().appendField("Home"); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour(190); }},
    robot_set_speed: { init() { this.appendDummyInput().appendField("Set Speed").appendField(new Blockly.FieldNumber(100), "SPEED"); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour(190); }},
    robot_vacuum_on: { init() { this.appendDummyInput().appendField("Vacuum ON"); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour(120); }},
    robot_vacuum_off: { init() { this.appendDummyInput().appendField("Vacuum OFF"); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour(120); }},
    robot_repeat: { init() { this.appendDummyInput().appendField("Repeat").appendField(new Blockly.FieldNumber(3, 1), "COUNT").appendField("times"); this.appendStatementInput("BODY"); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour(280); }},
    robot_wait: { init() { this.appendDummyInput().appendField("Wait").appendField(new Blockly.FieldNumber(300, 0), "MS").appendField("ms"); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour(280); }},
    robot_log: { init() { this.appendDummyInput().appendField("Log").appendField(new Blockly.FieldTextInput("message"), "MESSAGE"); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour(30); }},
  };
  for (const [name, def] of Object.entries(blocks)) { Blockly.Blocks[name] = def; }
}

function workspaceToProgram(Blockly: any, workspace: any): ProgramBlock[] {
  const program: ProgramBlock[] = [];
  for (const block of workspace.getTopBlocks(true)) {
    let current = block;
    while (current) { program.push(blockToJson(Blockly, current)); current = current.getNextBlock(); }
  }
  return program;
}

function blockToJson(Blockly: any, block: any): ProgramBlock {
  const t = block.type;
  if (t === "robot_move_to") return { type: "move_to", x: block.getFieldValue("X"), y: block.getFieldValue("Y"), z: block.getFieldValue("Z"), speed: block.getFieldValue("SPEED") };
  if (t === "robot_move_relative") return { type: "move_relative", dx: block.getFieldValue("DX"), dy: block.getFieldValue("DY"), dz: block.getFieldValue("DZ"), speed: block.getFieldValue("SPEED") };
  if (t === "robot_home") return { type: "home" };
  if (t === "robot_set_speed") return { type: "set_speed", speed: block.getFieldValue("SPEED") };
  if (t === "robot_vacuum_on") return { type: "vacuum_on" };
  if (t === "robot_vacuum_off") return { type: "vacuum_off" };
  if (t === "robot_wait") return { type: "wait", ms: block.getFieldValue("MS") };
  if (t === "robot_log") return { type: "log", message: block.getFieldValue("MESSAGE") };
  if (t === "robot_repeat") {
    const body: ProgramBlock[] = [];
    let child = block.getInputTargetBlock("BODY");
    while (child) { body.push(blockToJson(Blockly, child)); child = child.getNextBlock(); }
    return { type: "repeat", count: block.getFieldValue("COUNT"), body };
  }
  return { type: "log", message: `Unknown: ${t}` };
}
