// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import * as esprima from 'esprima';
import { Statement, ModuleDeclaration } from 'estree';

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('extension.quick-karma.run', () => {
		const describeTitle = getDescribeTitle()
		if (describeTitle == null) {
			return
		}
		const terminal = vscode.window.activeTerminal || vscode.window.createTerminal();
		terminal.sendText(`karma run -- --grep="${describeTitle}"`);
		terminal.show();
	});

	context.subscriptions.push(disposable);
}

export function deactivate() { }

function getDescribeTitle(){
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return
	}
	const doc = editor.document;
	let cur_selection = editor.selection;
	let line = cur_selection.anchor.line

	let startPos = new vscode.Position(0, 0);
	let endPos = new vscode.Position(doc.lineCount - 1, 10000);
	cur_selection = new vscode.Selection(startPos, endPos);
	const code = doc.getText(cur_selection);

	try {
		const ast = esprima.parseModule(code, { loc: true })
		if (ast.type !== 'Program') {
			vscode.window.showWarningMessage(`Quick Karma: Not found describe in ${doc.fileName}`);
			return
		}
		if (!ast.body.some(body => isDescribe(body))) {
			vscode.window.showWarningMessage(`Quick Karma: Not found describe in ${ doc.fileName }`);
			return
		}
		const describeTarget = ast.body.some(body => isDescribe(body) && isTarget(body, line))
			? ast.body.filter(body => isDescribe(body) && isTarget(body, line))
			: ast.body.filter(body => isDescribe(body))
		
		return describeTarget.map(body => {
			if (body.type === 'ExpressionStatement'
				&& body.expression.type === 'CallExpression'
				&& body.expression.arguments[0].type ==='Literal') {
					return body.expression.arguments[0].value;
			}
		}).join('|')
	} catch (err) {
		vscode.window.showErrorMessage(`Quick Karma: ${err} in ${doc.fileName}`);
		return
	}
}

function isDescribe(body: Statement | ModuleDeclaration) {
	return body.type === 'ExpressionStatement'
		&& body.expression.type === 'CallExpression'
		&& body.expression.callee.type === 'Identifier'
		&& body.expression.callee.name === 'describe'
}

function isTarget(body: Statement | ModuleDeclaration, line: number) {
	return body.loc
		&& body.loc.start.line <= line + 1
		&& body.loc.end.line >= line + 1
}