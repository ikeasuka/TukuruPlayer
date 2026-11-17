# Compatibility shims: RGSS2 targets Ruby 1.8, RGSS3 targets Ruby 1.9.
# This runtime uses Ruby 3.4, so restore commonly used removed APIs.
require 'js'
require 'zlib'

$stdout.sync = true
$stderr.sync = true

Fixnum = Integer unless defined?(Fixnum)
Bignum = Integer unless defined?(Bignum)
$KCODE = 'u'

class Object
  def taint; self; end unless method_defined?(:taint)
  def untaint; self; end unless method_defined?(:untaint)
  def tainted?; false; end unless method_defined?(:tainted?)
  def trust; self; end unless method_defined?(:trust)
  def untrust; self; end unless method_defined?(:untrust)
  def untrusted?; false; end unless method_defined?(:untrusted?)
  def =~(_other); nil; end unless method_defined?(:=~)
end

class << File
  alias_method :exists?, :exist? unless method_defined?(:exists?)
end
class << Dir
  alias_method :exists?, :exist? unless method_defined?(:exists?)
end
module FileTest
  class << self
    alias_method :exists?, :exist? unless method_defined?(:exists?)
  end
end

class Hash
  alias_method :index, :key unless method_defined?(:index)
end

class Array
  def nitems; count { |x| !x.nil? }; end unless method_defined?(:nitems)
  def choice; sample; end unless method_defined?(:choice)
end

class String
  def each(&block); each_line(&block); end unless method_defined?(:each)
end

class Integer
  def to_sym; to_s.to_sym; end unless method_defined?(:to_sym)
end

# Ruby 1.8 / 1.9 iterator? alias
module Kernel
  private
  def iterator?; block_given?; end unless private_method_defined?(:iterator?)
end

# Thread is not available in the WebAssembly build. Run the block immediately so
# that scripts using threads for background loading still work.
class Thread
  class << self
    alias_method :__tkr_orig_new, :new
    def new(*args, &block)
      t = TKRFakeThread.new
      t.__run(*args, &block)
      t
    end
    alias_method :start, :new
    alias_method :fork, :new
  end
end

class TKRFakeThread
  attr_reader :value
  def __run(*args)
    @value = yield(*args)
  rescue StandardError => e
    @error = e
  end
  def join(*); raise @error if @error; self; end
  def alive?; false; end
  def kill; self; end
  alias exit kill
  alias terminate kill
  def [](k); (@locals ||= {})[k]; end
  def []=(k, v); (@locals ||= {})[k] = v; end
  def priority=(v); end
  def priority; 0; end
  def status; false; end
  def wakeup; self; end
  def run; self; end
end
