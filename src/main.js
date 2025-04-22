import 'animate.css'
import Fuse from 'fuse.js'

import { addTest, getAllTests } from './db/tests'


const startButton = document.getElementById('start')
const text = document.getElementById('text')
const input = document.getElementById('input')
const form = document.getElementById('form')
const result = document.getElementById('result')

let startTime, endTime, testText

const randomString = len => {
  return Math.random().toString(36).substring(2, 2 + len)
}

const loremIpsum = len => {
  const words = [
    'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
    'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
    'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
    'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
    'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
    'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
    'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia',
    'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum'
  ]
  
  let result = []
  for (let i = 0; i < len; i++) {
    const randomIndex = Math.floor(Math.random() * words.length)
    result.push(words[randomIndex])
  }
  
  return result.join(' ')
}

startButton.addEventListener('click', event => {
  event.preventDefault()
  testText = loremIpsum(3)
  text.textContent = testText
  text.style.display = 'block'
  form.style.display = 'block'
  input.focus()
  startTime = Date.now()
  return false
})

startButton.focus()

form.addEventListener('submit', async(e)=> {
  e.preventDefault()
  const inputValue = input.value
  endTime = Date.now()
  const reactionTime = endTime - startTime
  
  const fuse = new Fuse([testText], {includeScore: true})
  const compare = fuse.search(inputValue)
  const similarity = 1 - compare[0].score
  
  result.innerHTML = `
    <p>Reaction Time: ${reactionTime} ms</p>
    <p>Similarity: ${Math.round(similarity * 100)}%</p>
  `
  result.style.display = 'block'
  result.classList.add('animate__animated', 'animate__zoomInDown')
  addTest(testText, startTime, endTime, reactionTime)
  
  // const history = await getAllTests()
  // console.log(history)
  return false
})