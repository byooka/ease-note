import React, { useEffect, useState, FC } from 'react'
import Note from './components/note'
import List from './components/list'
import { DEFAULT_EDITOR, Note as INote, Shape, THEME, DEFAULT_CONFIG } from './utils/const'
import { generateUUID, getMax, getRandomTheme, hasDataChanged, debounce } from './utils/tool'
import localDriver from './utils/local'
import localforage from 'localforage'
import Setting from './components/setting'

import './global.css'
import './iconfont.css'

let x, y
// 第一次挂载必然会变更notes, 加标志位不同步后端notes(第一次不更新，只拿notes，后续判断是否和缓存一样再决定是否二次刷新)
let isMounted = true

interface EaseNoteProps {
	container?: HTMLDivElement | HTMLElement | string
	// remote?: string
}

const defaultRemote = DEFAULT_CONFIG[2].storage[1].remote?.defaultValue as string

const EaseNote: FC<EaseNoteProps> = ({
	container = document.body,
}) => {
	const [notes, setNotes] = useState<INote[]>([])
	const [configs, setConfigs] = useState<any>({})
	const [isShowList, setIsShowList] = useState<boolean>(false)
	const [isShowSetting, setIsShowSetting] = useState<boolean>(false)
	const [mouseShape, setMouseShape] = useState<Shape>({ x: 0, y: 0, w: 0, h: 0 })
	const [remote, setRemote] = useState<string>(defaultRemote)

	const generateEditor = async (shape?: Shape) => {
		const realNotes = await _getItem('_notes_')
		const maxZIndex = getMax(realNotes, 'zIndex')

		const defaultTheme = configs['Note Theme'] ?? DEFAULT_EDITOR.theme

		const newNote = {
			...DEFAULT_EDITOR,
			id: generateUUID('note'),
			zIndex: maxZIndex + 1,
			shape: shape
				? { ...shape }
				: {
						...DEFAULT_EDITOR.shape,
						x: DEFAULT_EDITOR.shape.x + 20 * (realNotes.length - 1),
						y: DEFAULT_EDITOR.shape.y + 20 * (realNotes.length - 1),
				  },
			theme: defaultTheme === THEME.RANDOM ? getRandomTheme() : defaultTheme,
		}
		
		return newNote
	}

	const handleList = (isShow: boolean) => {
		setIsShowList(isShow)
	}

	const handleAdd = async () => {
		// e.stopPropagation()
    // e.nativeEvent?.stopImmediatePropagation()
		const note = await generateEditor()
		createData(note)
	}

	const handleDelete = (id: string) => {
		deleteData(id)
	}

	const handleVisible = (id: string, visible: boolean) => {
		updateNotes(id, 'visibility', visible)
	}

	const handleTheme = (id: string, theme: THEME) => {
		updateNotes(id, 'theme', theme)
	}

	const handleTitle = (id: string, title: string) => {
		updateNotes(id, 'title', title)
	}

	const handleEditorChange = async (id, html, editor) => {
		// 插槽嵌入的Editor, 此作用域的notes不对 -> TODO
		// 首次挂载时也会触发
		console.log('handleEditorChange----', id, html, editor.getText())
		// const isInit = !editor.getText().length
		// const realNotes = await _getItem('_notes_')
		// const curNotes = realNotes.map((n) =>
		// 	n.id === id ? { ...n, content: isInit ? n.content : html, updateTime: new Date().toLocaleString() } : n,
		// )
		// setNotes(curNotes)
		updateNotes(id, 'content', html)
	}

	const handleShapeEnd = (id, ps) => {
		console.log('handleDragEnd---', ps, notes)
		const ns = notes.filter(f => f.id === id).map((n) => (n.id === id ? { ...n, shape: { ...n.shape, ...ps } } : n))
		updateData(ns)
	}

	const updateNotes = (id: string, attr: string, value: any, isBatch = false) => {
		const newNotes = notes.filter(f => f.id === id).map((n) =>
			n.id === id ? { ...n, [attr]: value } : n,
		)
		updateData(newNotes)
	}

	const onMouseDown = (e) => {
		const { clientX, clientY } = e

		setMouseShape({
			...mouseShape,
			x: clientX,
			y: clientY,
		})
		x = clientX
		y = clientY
	}

	const onMouseUp = (e) => {
		const { clientX, clientY } = e

		const newShape = {
			...mouseShape,
			x,
			y,
			w: clientX - x,
			h: clientY - y,
		}

		setMouseShape(newShape)

		// 正确做法应该阻止Drag中拖拽事件冒泡 TODO
		if (e.target.id === 'note-container' && isValidShape(newShape)) {
			generateEditor(newShape)
		}
	}

	const isValidShape = (shape: Shape) => {
		const { w, h } = shape
		return w > 320 && h > 320
	}

	const getData = async () => {
		console.log('getData--remote', remote)
		// 先从本地取一次，渲染出页面来；然后从远程拿，比较是否有变化，有则更新
		const localNotes = await _getItem('_notes_') as any
		const initNotes = !!localNotes?.length ? localNotes : [{ ...DEFAULT_EDITOR, theme: THEME.PURPLE }]
		setNotes(initNotes)

		// 是否配置了远程 TODO
		if (!!remote?.length) {
			const res = await fetchData(`${remote}/list`)
			if (res?.code === 200 && !!res.data.length) {
				const dbNotes = res.data.map(d => {
					return {
						...d,
						zIndex: d.z_index
					}
				})
				const isChanged = hasDataChanged(localNotes, dbNotes)
				if (isChanged) {
					setNotes(dbNotes)

					localforage.setItem('_notes_', dbNotes, async () => {
						console.warn('updateData---setItem---', await _getItem('_notes_'))
					})
				}
			}
			
		}
	}

	const createData = async (note) => {
		if (!!remote?.length) {
			const res = await fetchData(`${remote}/list`, 'POST', { note })
			if (res.code === 200) {
				getData()
			}
		}
	}

	const updateData = async (notes) => {
		// 不保存没有编辑的note -> 初始content为空
		// 定时保存 -> 节流
		// localforage.setItem('_notes_', notes, async () => {
		// 	console.warn('updateData---setItem---', await _getItem('_notes_'))
		// })

		if (!isMounted) {
			if (!!remote?.length) {
				const res = await fetchData(`${remote}/list`, 'PUT', { notes })
				if (res.code === 200) {
					const ns = res.data.map(d => {
						return {
							...d,
							zIndex: d.z_index
						}
					})
					console.log('updateData---', ns)
					setNotes(ns)
					localforage.setItem('_notes_', ns, async () => {
						console.warn('updateData---setItem---', await _getItem('_notes_'))
					})
				}
			}
		}
		isMounted = false
	}

	const deleteData = async (id) => {
		if (!!remote?.length) {
			const res = await fetchData(`${remote}/list`, 'DELETE', { id })
			if (res.code === 200) {
				getData()
			}
		}
	}

	const fetchData = async (url = '', method = 'GET', data = {} ) => {
		try {
			const params = {
				method,
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include' // 携带cookie校验权限
			}
			if (method !== 'GET') {
				params['body'] = JSON.stringify(data)
			}
			const response = await fetch(url, params)
			return response.json()
		} catch (error) {
			console.log('error---', error)
		}
	}

	// useEffect(() => {
	// 	console.log('useEffect--notes---', notes)
	// 	if (!!notes.length) {
	// 		updateData(remote, notes)
	// 	}
	// }, [notes, remote])

	const getConfigs = async () => {
		const res = await fetchData(`${remote}/config`)
		console.log(res, '----')
		if (res.code === 200 && !!res.data.length) {
			const tempConfigs = JSON.parse(res.data)
			setConfigs(tempConfigs)

			const rs = tempConfigs['Remote Storage']
			if (!!rs?.length) {
				setRemote(rs)
			}
		} else {
			getData()
		}
	}

	const updateConfigs = async (c) => {
		const res = await fetchData(`${remote}/config`, 'POST', {configs: JSON.stringify(c)})
		console.log(res, '----')
		if (res.code === 200 && !!res.data.length) {
			const tempConfigs = JSON.parse(res.data)
			setConfigs(tempConfigs)
			setRemote(tempConfigs['Remote Storage'])
		}
	}

	const handleConfigChange = (c) => {
		updateConfigs(c)
	}

	useEffect(() => {
		getData()
	}, [remote])

	useEffect(() => {
		getConfigs()
	}, [])

	useEffect(() => {
		document.body.addEventListener('mousedown', onMouseDown)
		document.body.addEventListener('mouseup', onMouseUp)
		return () => {
			document.body.removeEventListener('mousedown', onMouseDown)
			document.body.removeEventListener('mouseup', onMouseUp)
		}
	}, [])

	const _getItem = async (key: string) => {
		return await localforage.getItem(key)
	}

	const displayNotes = notes.filter((n) => n.visibility)

	return (
		<div
			id="ease-note"
			// style={{position: "absolute", top: "0", left: "0", right: "0", bottom: "0"}}
			// onMouseDown={onMouseDown}
			// onMouseUp={onMouseUp}
		>
			{displayNotes.map((n) => (
				<Note
					key={n.id}
					{...n}
					onAdd={handleAdd}
					onClose={() => handleVisible(n.id, false)}
					onDelete={() => handleDelete(n.id)}
					onTheme={(theme) => handleTheme(n.id, theme)}
					onList={() => handleList(true)}
					onEditorChange={(html, editor) => handleEditorChange(n.id, html, editor)}
					onDragEnd={(ps) => handleShapeEnd(n.id, ps)}
					onResizeEnd={(ps) => handleShapeEnd(n.id, ps)}
					onTitleChange={(title) => handleTitle(n.id, title)}
					container={container}
				/>
			))}

			<List
				isShow={isShowList}
				notes={notes}
				onAdd={handleAdd}
				onClose={() => handleList(false)}
				onShow={(id) => handleVisible(id, true)}
				onSetting={() => setIsShowSetting(true)}
				onDelete={handleDelete}
			/>

			<Setting isShow={isShowSetting} onClose={() => setIsShowSetting(false)} configs={configs} onChange={handleConfigChange} />
		</div>
	)
}

export default EaseNote