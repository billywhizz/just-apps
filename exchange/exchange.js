class Node {
  constructor (data) {
    this.next = null
    this.data = data
  }
}

// Space = N
class List {
  constructor () {
    this.head = null
  }

  // O(1)
  isEmpty () {
    return this.head === null
  }

  // O(1)
  insert (data) {
    const entry = new Node(data)
    if (!this.head) {
      this.head = entry
    } else {
      entry.next = this.head
      this.head = entry
    }
    return entry
  }

  // O(N)
  size () {
    let count = 0
    this.walk(v => count++)
    return count
  }

  // O(N)
  search (data) {
    let next = this.head
    while (next) {
      if (next.data === data) return next
      next = next.next
    }
  }

  // O(N)
  remove (el) {
    let next = this.head
    let prev = next
    while (next) {
      if (next === el) {
        prev.next = next.next
        return
      }
      prev = next
      next = next.next
    }
  }

  // O(N)
  walk (fn) {
    let next = this.head
    while (next) {
      if (fn(next)) break
      next = next.next
    }
  }
}

// Space = N
class OrderedList extends List {
  // O(N)
  insert (data) {
    const head = this.head
    let next = head
    let prev = null
    while (next) {
      if (next.data > data) break
      prev = next
      next = next.next
    }
    const entry = new Node(data)
    if (!prev) {
      entry.next = head
      this.head = entry
    } else {
      entry.next = next
      prev.next = entry
    }
    return entry
  }
}

class SkNode {
  constructor () {
    this.left = null
    this.right = null
    this.top = null
    this.bottom = null
  }
}

// Space = N (or 2N)
class SkipList {
  constructor (height = 5) {
    this.size = 0
    this.prob = 0.5
    this.height = height
    this.lists = new Array(height)
  }
}

function create (L = List, items = 10) {
  const list = new L()
  for (let i = 0; i < items; i++) {
    list.insert(Math.ceil(Math.random() * 100))
  }
  return list
}

just.print('unordered')
const l = create()
l.walk(v => just.print(v.data))
just.print(`size ${l.size()}`)

just.print('ordered')
const ol = create(OrderedList)
ol.walk(v => just.print(v.data))
just.print(`size ${ol.size()}`)

const el = ol.insert(10)
just.print(el.data)
just.print(JSON.stringify(ol.search(10)))
ol.walk(v => just.print(v.data))

ol.remove(el)
just.print(JSON.stringify(ol.search(10)))
ol.walk(v => just.print(v.data))
just.print(ol.isEmpty())

const ol2 = new OrderedList()
just.print(ol2.isEmpty())

const sk = new SkipList()
just.print(sk.height)
