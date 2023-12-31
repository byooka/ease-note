import React, { FC, ReactElement, useRef, useState, useEffect } from "react";
import Editor from '../editor';
import Panel from '../panel';
import { THEME } from "../../utils/const";

import styles from './index.module.styl'

let themes = []
for (let t in THEME) {
  themes.push({ key: t, value: THEME[t]})
}

export interface EaseNoteProps {
  mode?: 'browser' | 'desktop'
  id: string
  shape: Shape
  title: string
  zIndex: number
  content: string
  theme: THEME
  container: HTMLDivElement | HTMLElement | string
  onAdd: () => void
  onClose: () => void
  onList: () => void
  onDelete: () => void
  onTheme: () => void
  onEditorChange: () => void
  onDragEnd: () => void
  onResizeEnd: () => void
  onTitleChange: (value: string) => void
}

interface Shape {
  x: number
  y: number
  w: number
  h: number
}

const Note: FC<EaseNoteProps> = ({
  onAdd,
  onClose,
  onList,
  onDelete,
  onTheme,
  onEditorChange,
  onDragEnd,
  onResizeEnd,
  onTitleChange,
  id,
  shape,
  title,
  zIndex,
  content,
  theme,
  container,
  ...rest
}) => {
  const [ resizable, setResizable ] = useState<boolean>(true)
  const [ isShowTheme, setIsShowTheme ] = useState<boolean>(false)
  const [ sTtile, setSTitle] = useState<string>('')
  const targetRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<ReactElement>(null)

  const handleMouseEnter = () => {
    // console.log('enter----')
    setResizable(true)
  }

  const handleMouseOver = () => {
    // console.log('over----')
    // setResizable(false)
  }

  const handleThemeChange = (theme: THEME) => {
    setIsShowTheme(false)

    onTheme && onTheme(theme)
  }

  const handleTitleChange = (e) => {
    setSTitle(e.target.value)
    onTitleChange && onTitleChange(e.target.value)
  }

  useEffect(() => {
    setSTitle(title)
  }, [title])

  const renderHeader = () => {
    return (
      <>
        {isShowTheme ? (
          <div className={styles.theme}>
            {themes.map(t => <span className={styles.block} style={{background: t.value}} onClick={() => handleThemeChange(t.value)}>{t.key.slice(0, 2)}</span>)}
          </div>
        ) : (
          <div className={styles.center}>
            <div className={styles.title}>
              <input name="title" value={sTtile} onChange={handleTitleChange} />
            </div>
            <div className={styles.options}>
              <span onClick={() => setIsShowTheme(true)}><i className="iconfont icon-theme"></i></span>
              <span onClick={onDelete}><i className="iconfont icon-delete"></i></span>
              <span onClick={onList}><i className="iconfont icon-list"></i></span>
            </div>
          </div>
          
        )}
      </>
      
    )
  }

  return (
    <div 
      className={styles.note}
      style={{ "--n-bg-color": theme, "--w-e-textarea-bg-color": theme, "--w-e-toolbar-bg-color": theme }}
    >
      <Panel 
        id={id}
        shape={shape}
        zIndex={zIndex}
        resizable={resizable}
        renderHeader={renderHeader}
        onMouseEnter={handleMouseEnter}
        onMouseOut={handleMouseOver}
        onAdd={onAdd}
        onClose={onClose}
        onDragEnd={onDragEnd}
        onResizeEnd={onResizeEnd}
        container={container}
        draggable
      >
        <Editor content={content} onChange={onEditorChange} />
      </Panel>
    </div>
    
  )
}

Note.defaultProps = {
  mode: 'browser'
}

export default Note