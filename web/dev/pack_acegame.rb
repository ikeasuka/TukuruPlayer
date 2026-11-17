# Builds a minimal VX Ace database (Data/*.rvdata2) so that a real Scripts.rvdata2
# (default scripts + plugins) can be run end-to-end by the dev server / e2e test.
#   ruby pack_acegame.rb <game_dir> <Scripts.rvdata2>
require 'zlib'
require 'fileutils'

# --- RGSS-compatible marshal classes for the host Ruby ------------------------------
class Table
  def initialize(x, y = nil, z = nil)
    @dim = z ? 3 : (y ? 2 : 1)
    @x = x; @y = y || 1; @z = z || 1
    @data = Array.new(@x * @y * @z, 0)
  end
  def [](x, y = 0, z = 0); @data[x + (y + z * @y) * @x]; end
  def []=(*a)
    v = a.pop
    x, y, z = a[0], a[1] || 0, a[2] || 0
    @data[x + (y + z * @y) * @x] = v
  end
  def _dump(_d = 0); [@dim, @x, @y, @z, @data.size].pack('l5') + @data.pack('s*'); end
end

class Color
  def initialize(r = 0, g = 0, b = 0, a = 255); @c = [r, g, b, a]; end
  def _dump(_d = 0); @c.pack('E4'); end
end

class Tone
  def initialize(r = 0, g = 0, b = 0, gr = 0); @c = [r, g, b, gr]; end
  def _dump(_d = 0); @c.pack('E4'); end
end

module Audio
  def self.method_missing(*); end
end

$TKR_ENGINE = 3
load File.join(__dir__, '..', 'rgss', 'rpg3.rb')

dir = ARGV[0]
scripts = ARGV[1]
data = File.join(dir, 'Data')
FileUtils.mkdir_p(data)
def save(path, obj)
  File.binwrite(path, Marshal.dump(obj))
end

F = RPG::BaseItem::Feature
cmd = ->(code, indent, params) { RPG::EventCommand.new(code, indent, params) }

# --- System ---------------------------------------------------------------------------
sys = RPG::System.new
sys.game_title = 'Ace Flow Test'
sys.party_members = [1, 2]
sys.currency_unit = 'G'
sys.elements = [nil, '物理', '炎']
sys.skill_types = [nil, '魔法']
sys.weapon_types = [nil, '剣']
sys.armor_types = [nil, '一般防具']
sys.switches = [nil] + Array.new(20) { '' }
sys.variables = [nil] + Array.new(20) { '' }
sys.title1_name = 'Title1'
sys.title2_name = ''
sys.start_map_id = 1
sys.start_x = 8
sys.start_y = 6
sys.window_tone = Tone.new(0, 0, 0, 0)
sys.terms.basic = %w[レベル Lv HP HP MP MP TP TP]
sys.terms.params = %w[最大HP 最大MP 攻撃力 防御力 魔法力 魔法防御 敏捷性 運]
sys.terms.etypes = %w[武器 盾 頭 身体 装飾品]
sys.terms.commands = %w[戦う 逃げる 攻撃 防御 アイテム スキル 装備 ステータス 並び替え セーブ ゲーム終了 オプション
                        武器 防具 大事なもの 装備変更 最強装備 全て外す ニューゲーム コンティニュー シャットダウン タイトルへ やめる]
sys.boat.character_name = 'Vehicle'
sys.ship.character_name = 'Vehicle'
sys.airship.character_name = 'Vehicle'
sys.title_bgm = RPG::BGM.new('Theme1', 100, 100)
sys.battle_bgm = RPG::BGM.new('Battle1', 100, 100)
sys.sounds = Array.new(24) { RPG::SE.new('Cursor1', 80, 100) }
save(File.join(data, 'System.rvdata2'), sys)

# --- database -------------------------------------------------------------------------
actors = [nil] + (1..2).map do |i|
  a = RPG::Actor.new
  a.id = i
  a.name = i == 1 ? 'エリック' : 'ナタリー'
  a.class_id = 1
  a.initial_level = 1
  a.character_name = 'Actor1'
  a.character_index = i - 1
  a.face_name = 'Actor1'
  a.face_index = i - 1
  a.equips = [1, 0, 0, 1, 0]
  a
end
save(File.join(data, 'Actors.rvdata2'), actors)

klass = RPG::Class.new
klass.id = 1
klass.name = '戦士'
klass.learnings = []
save(File.join(data, 'Classes.rvdata2'), [nil, klass])

skills = [nil] + %w[攻撃 防御 ファイア].each_with_index.map do |n, i|
  s = RPG::Skill.new
  s.id = i + 1
  s.name = n
  s.scope = i == 1 ? 11 : 1
  s.damage.type = i == 1 ? 0 : 1
  s.damage.formula = 'a.atk * 4 - b.def * 2'
  s.message1 = 'の攻撃！'
  s
end
save(File.join(data, 'Skills.rvdata2'), skills)

item = RPG::Item.new
item.id = 1
item.name = 'ポーション'
item.icon_index = 192
item.price = 50
item.effects = [RPG::UsableItem::Effect.new(11, 0, 0, 500)]
save(File.join(data, 'Items.rvdata2'), [nil, item])

weapon = RPG::Weapon.new
weapon.id = 1
weapon.name = 'ロングソード'
weapon.wtype_id = 1
weapon.params = [0, 0, 10, 0, 0, 0, 0, 0]
save(File.join(data, 'Weapons.rvdata2'), [nil, weapon])

armor = RPG::Armor.new
armor.id = 1
armor.name = 'レザーアーマー'
armor.atype_id = 1
armor.etype_id = 3
armor.params = [0, 0, 0, 5, 0, 0, 0, 0]
save(File.join(data, 'Armors.rvdata2'), [nil, armor])

enemy = RPG::Enemy.new
enemy.id = 1
enemy.name = 'スライム'
enemy.battler_name = 'Slime'
enemy.params = [30, 0, 8, 5, 5, 5, 5, 5]
enemy.exp = 3
enemy.gold = 5
save(File.join(data, 'Enemies.rvdata2'), [nil, enemy])

troop = RPG::Troop.new
troop.id = 1
troop.name = 'スライム*2'
troop.members = [0, 1].map do |i|
  m = RPG::Troop::Member.new
  m.enemy_id = 1
  m.x = 200 + i * 140
  m.y = 280
  m
end
save(File.join(data, 'Troops.rvdata2'), [nil, troop])

states = [nil] + %w[戦闘不能 毒].each_with_index.map do |n, i|
  s = RPG::State.new
  s.id = i + 1
  s.name = n
  s.restriction = i.zero? ? 4 : 0
  s.message1 = 'は倒れた！'
  s
end
save(File.join(data, 'States.rvdata2'), states)

# 200 animations (battle scripts refer to animation ids directly)
anims = [nil] + (1..200).map do |i|
  a = RPG::Animation.new
  a.id = i
  a.name = "アニメ#{i}"
  a.animation1_name = 'Attack1'
  a.frame_max = 6
  a.frames = Array.new(6) do |f|
    fr = RPG::Animation::Frame.new
    fr.cell_max = 1
    fr.cell_data = Table.new(1, 8)
    [f % 5, 0, 0, 100, 0, 0, 255, 1].each_with_index { |v, k| fr.cell_data[0, k] = v }
    fr
  end
  t = RPG::Animation::Timing.new
  t.frame = 1
  t.flash_scope = 1
  t.flash_color = Color.new(255, 255, 255, 160)
  a.timings = [t]
  a
end
save(File.join(data, 'Animations.rvdata2'), anims)

tileset = RPG::Tileset.new
tileset.id = 1
tileset.name = 'フィールド'
tileset.tileset_names = %w[TestA1 TestA2 TestA3 TestA4 TestA5 TestB TestC TestD TestE]
save(File.join(data, 'Tilesets.rvdata2'), [nil, tileset])

ce = RPG::CommonEvent.new
ce.id = 1
ce.name = '共通'
save(File.join(data, 'CommonEvents.rvdata2'), [nil, ce])

info = RPG::MapInfo.new
info.name = 'テストマップ'
save(File.join(data, 'MapInfos.rvdata2'), { 1 => info })

# --- map with events --------------------------------------------------------------------
map = RPG::Map.new(20, 15)
map.display_name = 'テストの村'
map.specify_battleback = true
map.battleback1_name = 'Grassland'
map.battleback2_name = 'Grassland'
map.tileset_id = 1
map.autoplay_bgm = true
map.bgm = RPG::BGM.new('Town1', 80, 100)
20.times { |x| 15.times { |y| map.data[x, y, 0] = 2816 + 0 * 48 } }
(0...20).each { |x| map.data[x, 0, 0] = 2816 + 2 * 48 + 46 }

def event(id, x, y, name, char, pages)
  e = RPG::Event.new(x, y)
  e.id = id
  e.name = name
  e.pages = pages
  e.pages.each { |pg| pg.graphic.character_name = char; pg.graphic.character_index = id % 8 }
  e
end

# autorun: opening message with faces, then self switch A
p1 = RPG::Event::Page.new
p1.trigger = 3
p1.list = [
  cmd.(101, 0, ['Actor1', 0, 0, 2]),
  cmd.(401, 0, ['ようこそ、テストの村へ！']),
  cmd.(401, 0, ['\\C[2]色付き\\C[0]の文字と\\V[1]番の変数。']),
  cmd.(101, 0, ['Actor1', 1, 0, 2]),
  cmd.(401, 0, ['二人目の顔グラフィックです。']),
  cmd.(102, 0, [%w[はい いいえ], 2]),
  cmd.(402, 0, [0, 'はい']),
  cmd.(101, 1, ['', 0, 0, 2]),
  cmd.(401, 1, ['はいを選びました。']),
  cmd.(0, 1, []),
  cmd.(402, 0, [1, 'いいえ']),
  cmd.(0, 1, []),
  cmd.(404, 0, []),
  cmd.(123, 0, ['A', 0]),
  cmd.(121, 0, [1, 1, 0]),
  cmd.(0, 0, []),
]
p2 = RPG::Event::Page.new
p2.condition.self_switch_valid = true
p2.condition.self_switch_ch = 'A'
p2.graphic.character_name = ''
map.events[1] = event(1, 1, 1, 'オープニング', '', [p1, p2])
map.events[1].pages.each { |pg| pg.graphic.character_name = '' }

# villager (action button)
v = RPG::Event::Page.new
v.trigger = 0
v.move_type = 1
v.list = [cmd.(101, 0, ['Actor1', 2, 0, 2]), cmd.(401, 0, ['こんにちは。']), cmd.(0, 0, [])]
map.events[2] = event(2, 10, 6, '村人', 'Actor1', [v])
# battle (sideview etc.) right after the opening: switch 1 -> battle -> switch 1 off
b = RPG::Event::Page.new
b.trigger = 3
b.condition.switch1_valid = true
b.condition.switch1_id = 1
b.list = [
  cmd.(301, 0, [0, 1, true, true]),
  cmd.(601, 0, []), cmd.(101, 1, ['', 0, 0, 2]), cmd.(401, 1, ['勝利！']), cmd.(0, 1, []),
  cmd.(602, 0, []), cmd.(0, 1, []),
  cmd.(603, 0, []), cmd.(0, 1, []),
  cmd.(604, 0, []),
  cmd.(121, 0, [1, 1, 1]),
  cmd.(0, 0, []),
]
map.events[3] = event(3, 2, 1, '戦闘', '', [b])
map.events[3].pages.each { |pg| pg.graphic.character_name = '' }
save(File.join(data, 'Map001.rvdata2'), map)

# --- scripts ---------------------------------------------------------------------------------
FileUtils.cp(scripts, File.join(data, 'Scripts.rvdata2'))
File.write(File.join(dir, 'Game.ini'), "[Game]\r\nRTP=RPGVXAce\r\nLibrary=System\\RGSS301.dll\r\nScripts=Data\\Scripts.rvdata2\r\nTitle=Ace Flow Test\r\n")
puts "database written to #{data}"
