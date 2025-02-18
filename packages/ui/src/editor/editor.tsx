'use client'

import * as React from 'react'

import {
  HTMLChakraProps,
  ThemingProps,
  chakra,
  forwardRef,
  useMultiStyleConfig,
} from '@chakra-ui/react'
import { createField } from '@saas-ui/forms'
import Placeholder from '@tiptap/extension-placeholder'
import { EditorContent, Editor as TipTapEditor, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

export interface EditorProps
  extends ThemingProps<'Textarea'>,
    HTMLChakraProps<'div'> {
  innerRef?: React.ForwardedRef<HTMLDivElement | null>
  value?: string
  defaultValue?: string
  placeholder?: string
}

export const Editor = React.forwardRef<TipTapEditor, EditorProps>(
  function Editor(props, ref) {
    const { defaultValue, onChange, value, placeholder, minHeight, ...rest } =
      props

    const styles = useMultiStyleConfig('Textarea', props)

    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        StarterKit,
        Placeholder.configure({
          placeholder,
        }),
      ],
      content: defaultValue,
      onUpdate: ({ editor }) => {
        const html = editor?.getHTML()
        /* @ts-ignore */
        onChange?.(html || '')
      },
    }) as TipTapEditor

    React.useImperativeHandle(ref, () => editor)

    React.useEffect(() => {
      if (!editor) return

      const { from, to } = editor.state.selection

      editor.commands.setContent(value || '', false, {
        preserveWhitespace: 'full',
      })

      editor.commands.setTextSelection({ from, to })
    }, [editor, value])

    const editorStyles = {
      '& .ProseMirror': {
        outline: 0,
        width: '100%',
        minHeight,
      },
      '& .ProseMirror p.is-editor-empty:first-of-type::before': {
        color: 'muted',
        content: 'attr(data-placeholder)',
        float: 'left',
        height: 0,
        pointerEvents: 'none',
      },
      ...styles,
      wordBreak: 'break-all',
      height: 'auto',
    }

    return (
      <chakra.div
        as={EditorContent}
        editor={editor}
        minHeight={minHeight}
        {...rest}
        __css={editorStyles}
      />
    )
  },
)

export const EditorField = createField<EditorProps>(
  forwardRef((props, ref) => {
    return <Editor ref={ref} {...props} />
  }),
  { isControlled: true },
)
