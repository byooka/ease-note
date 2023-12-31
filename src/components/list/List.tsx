import React, { FC, useState } from "react";
import Panel from "../panel";
import { generateUUID, generateCenterShape } from '../../utils/tool'
import { Note } from '../../utils/const'
import cn from 'classnames'
import { isMobile } from "../../utils/tool";

import styles from './index.module.styl'

const isPhone = isMobile()

export interface ListProps {
  isShow: boolean
  notes: Note[]
  activeId: string
  onAdd: () => void
  onClose: () => void
  onSetting: () => void
  onDoubleClick?: (id: string) => void
  onDelete: (id: string) => void
  onClick?: (id: string) => void
}

const List: FC<ListProps> = ({
  isShow,
  notes,
  activeId,
  onAdd,
  onClose,
  onSetting,
  onDoubleClick,
  onDelete,
  onClick
}) => {
  const [searchValue, setSearchValue] = useState('')

  const handleSearch = (e) => {
    setSearchValue(e.target.value)
  }

  const handleClear = () => {
    setSearchValue('')
  }

  const handleDelete = (id, e) => {
    e.stopPropagation()
    onDelete && onDelete(id)
  }

  const renderHeader = () => {
    return (
      <div className={styles.header}>
        <div className={styles.title}>EaseNote</div>
        <div className={styles.setting} onClick={onSetting}>
          <i className="iconfont icon-setting"></i>
        </div>
      </div>
    )
  }

  let filterNs = []
  if (notes.length > 0) {
    const sortNs = notes.sort((a, b) => new Date(b.update_time).getTime() - new Date(a.update_time).getTime())
    console.log('ssss', sortNs)
    filterNs = sortNs.filter(n => n.title.includes(searchValue) || n.content.includes(searchValue))
  }
  
  return (
    <div className={styles.list} style={{display: isShow ? "block" : "none", background: "blue"}}>
      <Panel 
        id={generateUUID("list")}
        shape={generateCenterShape('LIST', 0, 20, 40)}
        zIndex={9999}
        resizable={false}
        renderHeader={renderHeader}
        onAdd={onAdd}
        onClose={onClose}
        className={styles.panel}
      >
        <div className={styles["list-container"]}>
          <div className={styles.search}>
            <input value={searchValue} placeholder="请输入内容查询.." onChange={handleSearch} />
            <button onClick={handleClear}><i className="iconfont icon-close-copy"></i></button>
            <button><i className="iconfont icon-search"></i></button>
          </div>
          <div className={styles.content}>
            {filterNs.map(n => (
              <div 
                className={cn(styles.item, { [styles.hide]: !isPhone && !n.visibility }, { [styles.bar]: isPhone && n.active})} 
                style={{background: n.theme}}
                onDoubleClick={() => onDoubleClick(n.id)}
                onClick={() => onClick(n.id)}
              >
                <div className={styles.top}>
                  <div className={styles.left}>
                    <div className={styles.title} title={n.title}><span>{n.title}</span></div>
                    <div className={styles.time}>{n.updateTime ?? n.createTime}</div>
                  </div>
                  <div className={styles.option}>
                    <span onClick={(e) => handleDelete(n.id, e)}><i className="iconfont icon-delete"></i></span>
                  </div>
                </div>
                <div className={styles.detail}>
                  <div dangerouslySetInnerHTML={{__html: n.content}}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  )
}

export default List