"use client";
import { useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface DiagnosticMarker {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  message: string;
  severity: "error" | "warning" | "info";
}

// ─── Dynamic Monaco load (SSR disabled) ───────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyProps = Record<string, any>;

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        background: "#0a0c0f",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span style={{ color: "#5d6675", fontSize: "11px", fontFamily: "monospace" }}>
        Loading editor...
      </span>
    </div>
  ),
}) as React.ComponentType<AnyProps>;

// ─── Completion provider ───────────────────────────────────────────────────────

// Track which monaco instances already have providers registered (WeakSet avoids leaks)
const registeredInstances = new WeakSet<object>();

function registerRustExtensions(monaco: any) {
  if (registeredInstances.has(monaco)) return;
  registeredInstances.add(monaco);

  // ── Custom theme: Darcula-inspired ──────────────────────────────────────────
  monaco.editor.defineTheme("rustlings-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      // Keywords (orange, like Darcula)
      { token: "keyword", foreground: "CF8E6D", fontStyle: "bold" },
      { token: "keyword.control", foreground: "CF8E6D", fontStyle: "bold" },

      // Built-in types (light blue)
      { token: "type", foreground: "56A8F5" },
      { token: "type.identifier", foreground: "56A8F5" },

      // Strings (muted green)
      { token: "string", foreground: "6A8759" },
      { token: "string.char", foreground: "6AABAF" },
      { token: "string.escape", foreground: "CC7832" },

      // Numbers (blue)
      { token: "number", foreground: "6897BB" },

      // Comments (gray-green, italic)
      { token: "comment", foreground: "7A8399", fontStyle: "italic" },
      { token: "comment.doc", foreground: "7A9C6B", fontStyle: "italic" },

      // Operators and delimiters
      { token: "operator", foreground: "A9B7C6" },
      { token: "delimiter", foreground: "A9B7C6" },

      // Lifetime annotations (e.g. 'a)
      { token: "attribute", foreground: "BBB529" },

      // Macro invocations
      { token: "macro", foreground: "E8BF6A" },
    ],
    colors: {
      "editor.background": "#0a0c0f",
      "editor.foreground": "#A9B7C6",
      "editor.lineHighlightBackground": "#14171c80",
      "editorLineNumber.foreground": "#3C4250",
      "editorLineNumber.activeForeground": "#5d6675",
      "editorCursor.foreground": "#ABABAB",
      "editor.selectionBackground": "#1a3a6b",
      "editor.inactiveSelectionBackground": "#1a3a6b60",
      "editor.wordHighlightBackground": "#1a3a4b",
      "editor.wordHighlightStrongBackground": "#1a3a6b",
      "editorIndentGuide.background1": "#1f242c",
      "editorIndentGuide.activeBackground1": "#2a313b",
      "editorBracketMatch.background": "#2a313b",
      "editorBracketMatch.border": "#4a5568",
      // Diagnostics
      "editorError.foreground": "#e05c5c",
      "editorWarning.foreground": "#E5B66E",
      "editorInfo.foreground": "#6897BB",
      // Suggestion widget
      "editorSuggestWidget.background": "#14171c",
      "editorSuggestWidget.border": "#2a313b",
      "editorSuggestWidget.foreground": "#A9B7C6",
      "editorSuggestWidget.selectedBackground": "#1a3a6b",
      "editorSuggestWidget.highlightForeground": "#CF8E6D",
      // Hover widget
      "editorHoverWidget.background": "#14171c",
      "editorHoverWidget.border": "#2a313b",
    },
  });

  // ── Completion provider ─────────────────────────────────────────────────────
  const { CompletionItemKind, CompletionItemInsertTextRule } = monaco.languages;
  const Snippet = CompletionItemInsertTextRule.InsertAsSnippet;

  monaco.languages.registerCompletionItemProvider("rust", {
    triggerCharacters: [".", ":", "!"],
    provideCompletionItems: (model: any, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const kw = (label: string, insertText?: string, detail?: string) => ({
        label,
        kind: CompletionItemKind.Keyword,
        insertText: insertText ?? label,
        insertTextRules: insertText?.includes("$") ? Snippet : 0,
        detail: detail ?? "keyword",
        range,
      });

      const ty = (label: string, insertText?: string, detail?: string) => ({
        label,
        kind: CompletionItemKind.Class,
        insertText: insertText ?? label,
        insertTextRules: insertText?.includes("$") ? Snippet : 0,
        detail: detail ?? "type",
        range,
      });

      const mac = (label: string, insertText: string, detail?: string) => ({
        label: label + "!",
        kind: CompletionItemKind.Function,
        insertText,
        insertTextRules: Snippet,
        detail: detail ?? "macro",
        range,
      });

      const snip = (label: string, insertText: string, detail?: string) => ({
        label,
        kind: CompletionItemKind.Snippet,
        insertText,
        insertTextRules: Snippet,
        detail: detail ?? "snippet",
        range,
      });

      const trait_ = (label: string) => ({
        label,
        kind: CompletionItemKind.Interface,
        insertText: label,
        detail: "trait",
        range,
      });

      const suggestions = [
        // ── Control flow keywords ──────────────────────────────────────────
        kw("if", "if ${1:condition} {\n\t$0\n}", "if expression"),
        kw("if let", "if let ${1:Some(val)} = ${2:expr} {\n\t$0\n}", "if let binding"),
        kw("else", "else {\n\t$0\n}"),
        kw("else if", "else if ${1:condition} {\n\t$0\n}"),
        kw("match", "match ${1:expr} {\n\t${2:_} => $0,\n}", "pattern match"),
        kw("loop", "loop {\n\t$0\n}"),
        kw("while", "while ${1:condition} {\n\t$0\n}"),
        kw("while let", "while let ${1:Some(val)} = ${2:expr} {\n\t$0\n}"),
        kw("for", "for ${1:item} in ${2:iter} {\n\t$0\n}"),
        kw("in", "in"),
        kw("break", "break"),
        kw("continue", "continue"),
        kw("return", "return $0;"),

        // ── Declaration keywords ───────────────────────────────────────────
        kw("fn", "fn ${1:name}(${2}) {\n\t$0\n}", "function definition"),
        kw("let", "let ${1:name} = $0;"),
        kw("let mut", "let mut ${1:name} = $0;"),
        kw("const", "const ${1:NAME}: ${2:Type} = $0;"),
        kw("static", "static ${1:NAME}: ${2:Type} = $0;"),
        kw("struct", "struct ${1:Name} {\n\t$0\n}", "struct definition"),
        kw("enum", "enum ${1:Name} {\n\t$0\n}", "enum definition"),
        kw("impl", "impl ${1:Type} {\n\t$0\n}", "impl block"),
        kw("trait", "trait ${1:Name} {\n\t$0\n}", "trait definition"),
        kw("type", "type ${1:Alias} = $0;", "type alias"),
        kw("use", "use ${0:path};"),
        kw("mod", "mod ${1:name} {\n\t$0\n}"),
        kw("pub", "pub "),
        kw("pub(crate)", "pub(crate) "),
        kw("async", "async "),
        kw("await", "await"),
        kw("move", "move"),
        kw("unsafe", "unsafe {\n\t$0\n}"),
        kw("where", "where"),
        kw("ref", "ref"),
        kw("mut", "mut"),
        kw("dyn", "dyn"),
        kw("impl Trait", "impl ${1:Trait}", "impl trait"),
        kw("Box::new", "Box::new($0)", "heap allocation"),
        kw("self"),
        kw("Self"),
        kw("super"),
        kw("crate"),
        kw("true"),
        kw("false"),
        kw("as"),

        // ── Primitive types ────────────────────────────────────────────────
        ty("i8"), ty("i16"), ty("i32"), ty("i64"), ty("i128"), ty("isize"),
        ty("u8"), ty("u16"), ty("u32"), ty("u64"), ty("u128"), ty("usize"),
        ty("f32"), ty("f64"),
        ty("bool"),
        ty("char"),
        ty("str"),

        // ── Stdlib types ───────────────────────────────────────────────────
        ty("String", "String", "owned UTF-8 string"),
        ty("Vec", "Vec<${1:T}>", "growable array"),
        ty("Option", "Option<${1:T}>", "optional value"),
        ty("Result", "Result<${1:T}, ${2:E}>", "error handling"),
        ty("Box", "Box<${1:T}>", "heap-allocated value"),
        ty("Rc", "Rc<${1:T}>", "reference counted"),
        ty("Arc", "Arc<${1:T}>", "atomic reference counted"),
        ty("Cell", "Cell<${1:T}>", "interior mutability"),
        ty("RefCell", "RefCell<${1:T}>", "runtime borrow checking"),
        ty("Mutex", "Mutex<${1:T}>", "mutual exclusion"),
        ty("RwLock", "RwLock<${1:T}>", "read-write lock"),
        ty("HashMap", "HashMap<${1:K}, ${2:V}>", "hash map"),
        ty("HashSet", "HashSet<${1:T}>", "hash set"),
        ty("BTreeMap", "BTreeMap<${1:K}, ${2:V}>", "sorted map"),
        ty("BTreeSet", "BTreeSet<${1:T}>", "sorted set"),
        ty("VecDeque", "VecDeque<${1:T}>", "double-ended queue"),
        ty("BinaryHeap", "BinaryHeap<${1:T}>", "priority queue"),
        ty("Some", "Some($0)", "Option variant"),
        ty("None", "None", "Option variant"),
        ty("Ok", "Ok($0)", "Result variant"),
        ty("Err", "Err($0)", "Result variant"),
        ty("PhantomData", "PhantomData", "zero-size type marker"),

        // ── Macros ─────────────────────────────────────────────────────────
        mac("println", 'println!("${1}", ${2:})', "print line to stdout"),
        mac("print", 'print!("${1}", ${2:})', "print to stdout"),
        mac("eprintln", 'eprintln!("${1}", ${2:})', "print line to stderr"),
        mac("eprint", 'eprint!("${1}", ${2:})', "print to stderr"),
        mac("format", 'format!("${1}", ${2:})', "format string"),
        mac("write", 'write!(${1:f}, "${2:}", ${3:})', "write to writer"),
        mac("writeln", 'writeln!(${1:f}, "${2:}", ${3:})', "write line to writer"),
        mac("vec", "vec![${1:}]", "create a Vec"),
        mac("assert", "assert!(${1:condition})", "assertion"),
        mac("assert_eq", "assert_eq!(${1:left}, ${2:right})", "equality assertion"),
        mac("assert_ne", "assert_ne!(${1:left}, ${2:right})", "inequality assertion"),
        mac("panic", 'panic!("${1:message}")', "panic with message"),
        mac("todo", "todo!()", "mark as unimplemented"),
        mac("unimplemented", "unimplemented!()", "mark as unimplemented"),
        mac("unreachable", "unreachable!()", "mark as unreachable"),
        mac("dbg", "dbg!(${1:expr})", "debug print"),
        mac("include_str", 'include_str!("${1:path}")', "include file as &str"),
        mac("env", 'env!("${1:VAR}")', "read env var at compile time"),
        mac("concat", "concat!(${1:})", "concatenate literals"),
        mac("cfg", "cfg!(${1:feature})", "conditional compilation check"),

        // ── Common traits ──────────────────────────────────────────────────
        trait_("Display"),
        trait_("Debug"),
        trait_("Clone"),
        trait_("Copy"),
        trait_("Default"),
        trait_("PartialEq"),
        trait_("Eq"),
        trait_("PartialOrd"),
        trait_("Ord"),
        trait_("Hash"),
        trait_("From"),
        trait_("Into"),
        trait_("TryFrom"),
        trait_("TryInto"),
        trait_("AsRef"),
        trait_("AsMut"),
        trait_("Deref"),
        trait_("DerefMut"),
        trait_("Iterator"),
        trait_("IntoIterator"),
        trait_("FromIterator"),
        trait_("Read"),
        trait_("Write"),
        trait_("Seek"),
        trait_("BufRead"),
        trait_("Drop"),
        trait_("Send"),
        trait_("Sync"),
        trait_("Fn"),
        trait_("FnMut"),
        trait_("FnOnce"),
        trait_("Error"),
        trait_("ToString"),
        trait_("FromStr"),

        // ── Common snippets ────────────────────────────────────────────────
        snip("fn main", "fn main() {\n\t$0\n}", "main function"),
        snip("#[derive]", "#[derive(${1:Debug})]", "derive macro"),
        snip("#[derive(Debug, Clone)]", "#[derive(Debug, Clone)]"),
        snip("#[derive(Debug, Clone, PartialEq)]", "#[derive(Debug, Clone, PartialEq)]"),
        snip("impl Display", "impl std::fmt::Display for ${1:Type} {\n\tfn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {\n\t\twrite!(f, \"${2:}\")\n\t}\n}", "impl Display"),
        snip("impl From", "impl From<${1:FromType}> for ${2:ToType} {\n\tfn from(val: ${1:FromType}) -> Self {\n\t\t$0\n\t}\n}", "impl From"),
        snip("impl Iterator", "impl Iterator for ${1:Type} {\n\ttype Item = ${2:Item};\n\n\tfn next(&mut self) -> Option<Self::Item> {\n\t\t$0\n\t}\n}", "impl Iterator"),
        snip("impl Default", "impl Default for ${1:Type} {\n\tfn default() -> Self {\n\t\t$0\n\t}\n}", "impl Default"),
        snip("test module", "#[cfg(test)]\nmod tests {\n\tuse super::*;\n\n\t#[test]\n\tfn ${1:test_name}() {\n\t\t$0\n\t}\n}", "test module"),
        snip("#[test]", "#[test]\nfn ${1:test_name}() {\n\t$0\n}", "test function"),
      ];

      return { suggestions };
    },
  });
}

// ─── Component ─────────────────────────────────────────────────────────────────

interface Props {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string;
  markers?: DiagnosticMarker[];
}

export default function CodeEditor({
  value,
  onChange,
  readOnly = false,
  height = "480px",
  markers = [],
}: Props) {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const lastInternalValueRef = useRef(value);

  // Called before the editor DOM node is created - perfect for defining themes
  const handleBeforeMount = useCallback((monaco: any) => {
    registerRustExtensions(monaco);
  }, []);

  // Called after the editor mounts - store refs for imperative updates
  const handleMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  }, []);

  const handleChange = useCallback((v: string | undefined) => {
    const nextValue = v ?? "";
    lastInternalValueRef.current = nextValue;
    onChange?.(nextValue);
  }, [onChange]);

  // Keep Monaco fast while typing by avoiding controlled model updates.
  // External changes, such as reset or a new exercise, still replace the model.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || lastInternalValueRef.current === value) return;
    const model = editor.getModel();
    if (!model || model.getValue() === value) return;

    editor.setValue(value);
    lastInternalValueRef.current = value;
  }, [value]);

  // Push diagnostic markers into the editor model whenever they change
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const model = editor.getModel();
    if (!model) return;

    monaco.editor.setModelMarkers(
      model,
      "rustc",
      markers.map((m) => ({
        startLineNumber: m.startLineNumber,
        startColumn: m.startColumn,
        endLineNumber: m.endLineNumber,
        endColumn: m.endColumn,
        message: m.message,
        severity:
          m.severity === "error"
            ? monaco.MarkerSeverity.Error
            : m.severity === "warning"
            ? monaco.MarkerSeverity.Warning
            : monaco.MarkerSeverity.Info,
      }))
    );
  }, [markers]);

  return (
    <div style={{ overscrollBehavior: "contain" }}>
    <MonacoEditor
      height={height}
      language="rust"
      theme="rustlings-dark"
      defaultValue={value}
      onChange={handleChange}
      beforeMount={handleBeforeMount}
      onMount={handleMount}
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontLigatures: true,
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        padding: { top: 12, bottom: 12 },
        automaticLayout: true,
        readOnly,
        renderLineHighlight: "line",
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: true,
        scrollbar: {
          alwaysConsumeMouseWheel: true,
          verticalScrollbarSize: 6,
          horizontalScrollbarSize: 6,
        },
        lineDecorationsWidth: 4,
        lineNumbersMinChars: 3,
        tabSize: 4,
        insertSpaces: true,
        wordWrap: "off",
        // Completion & suggestions
        quickSuggestions: { other: true, comments: false, strings: false },
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnEnter: "on",
        tabCompletion: "on",
        wordBasedSuggestions: "currentDocument",
        suggest: {
          showKeywords: true,
          showSnippets: true,
          showClasses: true,
          showFunctions: true,
          showInterfaces: true,
          showMethods: true,
          showVariables: true,
          filterGraceful: true,
          preview: true,
          previewMode: "subwordSmart",
          insertMode: "replace",
        },
        // Parameter hints (shows function signature while typing)
        parameterHints: { enabled: true },
        // Bracket pair colorization
        bracketPairColorization: { enabled: true },
        // Guide lines for blocks
        guides: {
          bracketPairs: false,
          indentation: true,
        },
        // Show inline diagnostics in the gutter
        glyphMargin: true,
        // Better word selection
        wordSeparators: "`~!@#$%^&*()-=+[{]}\\|;:'\",.<>/?",
        // Hover with type info from markers
        hover: { enabled: true, delay: 300 },
      }}
    />
    </div>
  );
}
