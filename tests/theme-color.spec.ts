import {expect,test,type Page} from '@playwright/test'

type Theme = 'light' | 'dark'
type StartupCase = {name:string;device:Theme;stored?:string;denied?:boolean;expected:Theme}
const colors:Record<Theme,string> = {light:'#ffffff',dark:'#000000'}
const startupCases:StartupCase[] = [
 {name:'saved dark on a light device',device:'light',stored:'dark',expected:'dark'},
 {name:'saved light on a dark device',device:'dark',stored:'light',expected:'light'},
 {name:'dark device without a preference',device:'dark',expected:'dark'},
 {name:'light device without a preference',device:'light',expected:'light'},
 {name:'malformed preference on a dark device',device:'dark',stored:'invalid',expected:'dark'},
 {name:'denied storage on a dark device',device:'dark',denied:true,expected:'dark'},
]

async function expectTheme(page:Page,theme:Theme){
 await expect(page.locator('html')).toHaveAttribute('data-theme',theme)
 await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1)
 await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content',colors[theme])
}

for(const scenario of startupCases)test(`PWA bar matches ${scenario.name} before React loads`,async({page})=>{
 await page.emulateMedia({colorScheme:scenario.device})
 await page.addInitScript(({stored,denied})=>{
  if(stored!==undefined)localStorage.setItem('sudoku-theme',stored)
  if(denied)Storage.prototype.getItem=()=>{throw new DOMException('Denied','SecurityError')}
 },scenario)
 await page.route('**/src/main.tsx',route=>route.abort())
 await page.goto('/')
 await expect(page.locator('#root')).toBeEmpty()
 await expectTheme(page,scenario.expected)
})

test('PWA bar follows theme settings, device changes and reload',async({page})=>{
 await page.emulateMedia({colorScheme:'light'})
 await page.goto('/')
 await page.getByRole('button',{name:'Settings',exact:true}).click()
 const theme=page.getByLabel('Theme',{exact:true})
 await theme.selectOption('dark')
 await expectTheme(page,'dark')
 await page.reload()
 await expectTheme(page,'dark')
 await page.getByRole('button',{name:'Settings',exact:true}).click()
 await theme.selectOption('light')
 await expectTheme(page,'light')
 await page.emulateMedia({colorScheme:'dark'})
 await expectTheme(page,'light')
 await theme.selectOption('device')
 await expectTheme(page,'dark')
 await page.emulateMedia({colorScheme:'light'})
 await expectTheme(page,'light')
 await page.emulateMedia({colorScheme:'dark'})
 await expectTheme(page,'dark')
 await theme.selectOption('dark')
 await page.emulateMedia({colorScheme:'light'})
 await expectTheme(page,'dark')
})

test('PWA bar follows live theme settings when preference storage is denied',async({page})=>{
 await page.emulateMedia({colorScheme:'light'})
 await page.addInitScript(()=>{
  Storage.prototype.getItem=()=>{throw new DOMException('Denied','SecurityError')}
  Storage.prototype.setItem=()=>{throw new DOMException('Denied','SecurityError')}
 })
 await page.goto('/')
 await page.getByRole('button',{name:'Settings',exact:true}).click()
 const theme=page.getByLabel('Theme',{exact:true})
 await theme.selectOption('dark')
 await expectTheme(page,'dark')
 await theme.selectOption('light')
 await expectTheme(page,'light')
})
