// sample_096
//
// WebGLでVTFによるGPGPUパーティクル 512*512=260000 個

// フレームバッファをfrontとbackをflipしてる！

// runではじめにbool
// // ループのために再帰呼び出し
// if(run){requestAnimationFrame(render);}

//// フレームバッファをオブジェクトとして生成する関数//第三引数にフォーマット！浮動小数店テクスチャ使うときはgl.UNSIGNED_BYTEを gl.FLOATにしないとマイナスが書き込めない！！
	// function create_framebuffer(width, height, format){
	// 	// フォーマットチェック
	// 	var textureFormat = null;
	// 	if(!format){
	// 		textureFormat = gl.UNSIGNED_BYTE;
	// 	}else{
	// 		textureFormat = format;
    // 	}
    
    //これもちゃんとチェックする！！
    // // 浮動小数点数テクスチャが利用可能かどうかチェック
	// var ext;
	// ext = gl.getExtension('OES_texture_float') || gl.getExtension('OES_texture_half_float');
	// if(ext == null){
	// 	alert('float texture not supported');
	// 	return;
	// }

window.onload = function(){
    var c;
    var i, j;
	var run = true;           // アニメーション継続フラグ
	var velocity = 0;         // パーティクルの加速度係数
	// var mouseFlag = false;    // マウス操作のフラグ
	var mouseFlag = true; 
	var mousePositionX = 0.0; // マウス座標X（-1.0 から 1.0）
	var mousePositionY = 0.0; // マウス座標Y（-1.0 から 1.0）
	
	// canvasエレメントを取得
	c = document.getElementById('canvas');
	// //c.width = Math.min(window.innerWidth, window.innerHeight);
	// c.width = Math.max(window.innerWidth, window.innerHeight);
	// c.height = c.width;
	c.width = window.innerWidth;
	c.height = window.innerHeight;
	
	// WebGLコンテキストの初期化
	var gl = c.getContext('webgl');
	
	// イベント登録
	c.addEventListener('mousedown', mouseDown, true);
	c.addEventListener('mouseup', mouseUp, true);
	c.addEventListener('mousemove', mouseMove, true);
	window.addEventListener('keydown', keyDown, true);
	
	// 頂点テクスチャフェッチが利用可能かどうかチェック
	i = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
	if(i > 0){
		console.log('max_vertex_texture_imaeg_unit: ' + i);
	}else{
		alert('VTF not supported');
		return;
	}
	
	// 浮動小数点数テクスチャが利用可能かどうかチェック
	var ext;
	ext = gl.getExtension('OES_texture_float') || gl.getExtension('OES_texture_half_float');
	if(ext == null){
		alert('float texture not supported');
		return;
	}
	
	// シェーダ用変数
	var v_shader, f_shader;
	
	// 頂点のレンダリングを行うシェーダ
	v_shader = create_shader('point_vs');
	f_shader = create_shader('point_fs');
	var pPrg = create_program(v_shader, f_shader);
	
	// locationの初期化
	var pAttLocation = [];
	pAttLocation[0] = gl.getAttribLocation(pPrg, 'index');
	pAttLocation[1] = gl.getAttribLocation(pPrg, 'color');
	var pAttStride = [];
	pAttStride[0] = 1;
	pAttStride[1] = 4;
	var pUniLocation = [];
	pUniLocation[0] = gl.getUniformLocation(pPrg, 'resolution');
	pUniLocation[1] = gl.getUniformLocation(pPrg, 'texture');
	pUniLocation[2] = gl.getUniformLocation(pPrg, 'pointScale');
	pUniLocation[3] = gl.getUniformLocation(pPrg, 'ambient');


	// var pAttLocation = [];
	// pAttLocation[0] = gl.getAttribLocation(pPrg, 'position');
	// var pAttStride = [];
	// pAttStride[0] = 3;
	// var pUniLocation = [];
	// pUniLocation[0] = gl.getUniformLocation(pPrg, 'resolution');
	// pUniLocation[1] = gl.getUniformLocation(pPrg, 'texture');



	
	// テクスチャへの描き込みを行うシェーダ
	v_shader = create_shader('velocity_vs');
	f_shader = create_shader('velocity_fs');
	var vPrg = create_program(v_shader, f_shader);
	
	// locationの初期化
	var vAttLocation = [];
	vAttLocation[0] = gl.getAttribLocation(vPrg, 'position');
	var vAttStride = [];
	vAttStride[0] = 3;
	var vUniLocation = [];
	vUniLocation[0] = gl.getUniformLocation(vPrg, 'resolution');
	vUniLocation[1] = gl.getUniformLocation(vPrg, 'texture');
	vUniLocation[2] = gl.getUniformLocation(vPrg, 'mouse');
	vUniLocation[3] = gl.getUniformLocation(vPrg, 'mouseFlag');
	vUniLocation[4] = gl.getUniformLocation(vPrg, 'velocity');
	vUniLocation[5] = gl.getUniformLocation(vPrg, 'time');
	vUniLocation[6] = gl.getUniformLocation(vPrg, 'angleCount');
	
	
	// テクスチャへの描き込みを行うシェーダ
	v_shader = create_shader('default_vs');
	f_shader = create_shader('default_fs');
	var dPrg = create_program(v_shader, f_shader);
	
	// locationの初期化
	var dAttLocation = [];
	dAttLocation[0] = gl.getAttribLocation(dPrg, 'position');
	var dAttStride = [];
	dAttStride[0] = 3;
	var dUniLocation = [];
	dUniLocation[0] = gl.getUniformLocation(dPrg, 'resolution');
	
	// テクスチャの幅と高さ
	var TEXTURE_WIDTH  = 512;
	var TEXTURE_HEIGHT = 512;
	var resolution = [TEXTURE_WIDTH, TEXTURE_HEIGHT];
	
	// 頂点
	var vertices = new Array(TEXTURE_WIDTH * TEXTURE_HEIGHT);
	// 頂点ごとのカラー
	var colors = new Array(TEXTURE_WIDTH * TEXTURE_HEIGHT * 4);
	
	// 頂点のインデックスを連番で割り振る
	for(i = 0, j = vertices.length; i < j; i++){
		vertices[i] = i;
	}

	// 頂点のカラー
	for(i = 0, j = colors.length; i < j; i+=4){
		// if(i < 500000){
		// 	colors[i] = 0.2;
		// 	colors[i +1] = 0.6;
		// 	colors[i +2] = 0.9;
		// 	colors[i +3] = 0.02;
		// }else{
		// 	colors[i] = 0.9;
		// 	colors[i +1] = 0.9;
		// 	colors[i +2] = 0.2;
		// 	colors[i +3] = 0.02;
		// }

		if(i > 500000 ){
			var col = hsva(180, 1.0, 0.2, 0.09);
		}else if(i < 500000 && i > 400000 ){
			var col = hsva(280, 1.0, 0.2, 0.9);
		}else if(i < 400000 && i > 100000 ){
			var col = hsva(50, 1.0, 0.6, 0.09);
		}else{
			var col = hsva(220, 1.0, 0.6, 0.09);	
		}
		colors[i] = col[0];
		colors[i +1] = col[1];
		colors[i +2] = col[2];
		colors[i +3] = col[3];
		
	}
	
	// 頂点情報からVBO生成
	var vIndex = create_vbo(vertices);
	var vColor = create_vbo(colors);
	var vVBOList = [vIndex, vColor];
	
	// 板ポリ
	var position = [
		-1.0,  1.0,  0.0,
		-1.0, -1.0,  0.0,
		 1.0,  1.0,  0.0,
		 1.0, -1.0,  0.0
	];
	var vPlane = create_vbo(position);
	var planeVBOList = [vPlane];


	
	// フレームバッファの生成
	var backBuffer  = create_framebuffer(TEXTURE_WIDTH, TEXTURE_WIDTH, gl.FLOAT);
	var frontBuffer = create_framebuffer(TEXTURE_WIDTH, TEXTURE_WIDTH, gl.FLOAT);
	var flip = null;
	
	// フラグ
	gl.disable(gl.BLEND);
	gl.blendFunc(gl.ONE, gl.ONE);
	
	// デフォルトの頂点情報を書き込む
	(function(){
		// フレームバッファをバインド
		gl.bindFramebuffer(gl.FRAMEBUFFER, backBuffer.f);
		
		// ビューポートを設定
		gl.viewport(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
		
		// フレームバッファを初期化
		gl.clearColor(0.0, 0.0, 0.0, 0.0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		
		// プログラムオブジェクトの選択
		gl.useProgram(dPrg);
		
		// テクスチャへ頂点情報をレンダリング
		set_attribute(planeVBOList, dAttLocation, dAttStride);
		gl.uniform2fv(dUniLocation[0], resolution);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, position.length / 3);
	})();
	
	// レンダリング関数の呼び出し
	var count = 0;
	var time = 0;
	var ambient = [];
	var angleCount = 0;

	render();
	
	// 恒常ループ
	function render(){

		// 時間管理
		time = new Date().getTime();//*0.0000000001;

		angleCount += 1;



		// ブレンドは無効化
		gl.disable(gl.BLEND);
		
		// フレームバッファをバインド
		gl.bindFramebuffer(gl.FRAMEBUFFER, frontBuffer.f);
		
		// ビューポートを設定
		gl.viewport(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
		
		// フレームバッファを初期化
		gl.clearColor(0.0, 0.0, 0.0, 0.0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		
		// プログラムオブジェクトの選択
		gl.useProgram(vPrg);
		
		// テクスチャとしてバックバッファをバインド
		gl.bindTexture(gl.TEXTURE_2D, backBuffer.t);
		
		// テクスチャへ頂点情報をレンダリング
		set_attribute(planeVBOList, vAttLocation, vAttStride);
		gl.uniform2fv(vUniLocation[0], resolution);
		gl.uniform1i(vUniLocation[1], 0);
		gl.uniform2fv(vUniLocation[2], [mousePositionX, mousePositionY]);
		gl.uniform1i(vUniLocation[3], mouseFlag);
		gl.uniform1f(vUniLocation[4], velocity);
		gl.uniform1f(vUniLocation[5], time);
		gl.uniform1f(vUniLocation[6], angleCount);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, position.length / 3);
		
		// パーティクルの色
		count++;
		// ambient = hsva(count % 360, 1.0, 0.8, 1.0);
		ambient = hsva(50, 1.0, 0.8, 0.1);
		
		// ブレンドを有効化
		gl.enable(gl.BLEND);
		
		// ビューポートを設定
		gl.viewport(0, 0, c.width, c.height);
		
		// フレームバッファのバインドを解除
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.clearColor(0.05, 0.05, 0.15, 1.0);
		// gl.clearColor(0.2, 0.2, 0.2, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		
		// プログラムオブジェクトの選択
		gl.useProgram(pPrg);
		
		// フレームバッファをテクスチャとしてバインド
		gl.bindTexture(gl.TEXTURE_2D, frontBuffer.t);
		
		// 頂点を描画
		set_attribute(vVBOList, pAttLocation, pAttStride);
		gl.uniform2fv(pUniLocation[0], resolution);
		gl.uniform1i(pUniLocation[1], 0);
		gl.uniform1f(pUniLocation[2], velocity);
		gl.uniform4fv(pUniLocation[3], ambient);
		gl.drawArrays(gl.POINTS, 0, vertices.length);
		// set_attribute(planeVBOList, pAttLocation, pAttStride);
		// gl.uniform2fv(pUniLocation[0], resolution);
		// gl.uniform1i(pUniLocation[1], 0);
		// gl.drawArrays(gl.TRIANGLE_STRIP, 0, position.length / 3);


		
		// コンテキストの再描画
		gl.flush();
		
		// 加速度の調整
		if(mouseFlag){
			velocity = 1.0;
		}else{
			velocity *= 0.95;
		}
		
		// フレームバッファをフリップ
		flip = backBuffer;
		backBuffer = frontBuffer;
		frontBuffer = flip;
		
		// ループのために再帰呼び出し
		if(run){requestAnimationFrame(render);}
	}
	
	// イベント処理
	function mouseDown(eve){
        mouseFlag = true;
	}
	function mouseUp(eve){
		// mouseFlag = false;
	}
	function mouseMove(eve){
		// if(mouseFlag){
		// 	var cw = c.width;
		// 	var ch = c.height;
		// 	mousePositionX = (eve.clientX - c.offsetLeft - cw / 2.0) / cw * 2.0;
		// 	mousePositionY = -(eve.clientY - c.offsetTop - ch / 2.0) / ch * 2.0;
		// }
	}
	function keyDown(eve){
		run = (eve.keyCode !== 27);
	}
	
	// シェーダを生成する関数
	function create_shader(id){
		// シェーダを格納する変数
		var shader;
		
		// HTMLからscriptタグへの参照を取得
		var scriptElement = document.getElementById(id);
		
		// scriptタグが存在しない場合は抜ける
		if(!scriptElement){return;}
		
		// scriptタグのtype属性をチェック
		switch(scriptElement.type){
			
			// 頂点シェーダの場合
			case 'x-shader/x-vertex':
				shader = gl.createShader(gl.VERTEX_SHADER);
				break;
				
			// フラグメントシェーダの場合
			case 'x-shader/x-fragment':
				shader = gl.createShader(gl.FRAGMENT_SHADER);
				break;
			default :
				return;
		}
		
		// 生成されたシェーダにソースを割り当てる
		gl.shaderSource(shader, scriptElement.text);
		
		// シェーダをコンパイルする
		gl.compileShader(shader);
		
		// シェーダが正しくコンパイルされたかチェック
		if(gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
			
			// 成功していたらシェーダを返して終了
			return shader;
		}else{
			
			// 失敗していたらエラーログをアラートする
			alert(gl.getShaderInfoLog(shader));
		}
	}
	
	// プログラムオブジェクトを生成しシェーダをリンクする関数
	function create_program(vs, fs){
		// プログラムオブジェクトの生成
		var program = gl.createProgram();
		
		// プログラムオブジェクトにシェーダを割り当てる
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		
		// シェーダをリンク
		gl.linkProgram(program);
		
		// シェーダのリンクが正しく行なわれたかチェック
		if(gl.getProgramParameter(program, gl.LINK_STATUS)){
		
			// 成功していたらプログラムオブジェクトを有効にする
			gl.useProgram(program);
			
			// プログラムオブジェクトを返して終了
			return program;
		}else{
			
			// 失敗していたらエラーログをアラートする
			alert(gl.getProgramInfoLog(program));
		}
	}
	
	// VBOを生成する関数
	function create_vbo(data){
		// バッファオブジェクトの生成
		var vbo = gl.createBuffer();
		
		// バッファをバインドする
		gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
		
		// バッファにデータをセット
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
		
		// バッファのバインドを無効化
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		
		// 生成した VBO を返して終了
		return vbo;
	}
	
	// VBOをバインドし登録する関数
	function set_attribute(vbo, attL, attS){
		// 引数として受け取った配列を処理する
		for(var i in vbo){
			// バッファをバインドする
			gl.bindBuffer(gl.ARRAY_BUFFER, vbo[i]);
			
			// attributeLocationを有効にする
			gl.enableVertexAttribArray(attL[i]);
			
			// attributeLocationを通知し登録する
			gl.vertexAttribPointer(attL[i], attS[i], gl.FLOAT, false, 0, 0);
		}
	}
	
	// フレームバッファをオブジェクトとして生成する関数//第三引数にフォーマット！浮動小数店テクスチャ使うときはgl.UNSIGNED_BYTEを gl.FLOATにしないとマイナスが書き込めない！！
	function create_framebuffer(width, height, format){
		// フォーマットチェック
		var textureFormat = null;
		if(!format){
			textureFormat = gl.UNSIGNED_BYTE;
		}else{
			textureFormat = format;
		}
		
		// フレームバッファの生成
		var frameBuffer = gl.createFramebuffer();
		
		// フレームバッファをWebGLにバインド
		gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
		
		// 深度バッファ用レンダーバッファの生成とバインド
		var depthRenderBuffer = gl.createRenderbuffer();
		gl.bindRenderbuffer(gl.RENDERBUFFER, depthRenderBuffer);
		
		// レンダーバッファを深度バッファとして設定
		gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
		
		// フレームバッファにレンダーバッファを関連付ける
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRenderBuffer);
		
		// フレームバッファ用テクスチャの生成
		var fTexture = gl.createTexture();
		
		// フレームバッファ用のテクスチャをバインド
		gl.bindTexture(gl.TEXTURE_2D, fTexture);
		
		// フレームバッファ用のテクスチャにカラー用のメモリ領域を確保
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, textureFormat, null);
		
		// テクスチャパラメータ
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		
		// フレームバッファにテクスチャを関連付ける
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fTexture, 0);
		
		// 各種オブジェクトのバインドを解除
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.bindRenderbuffer(gl.RENDERBUFFER, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		
		// オブジェクトを返して終了
		return {f : frameBuffer, d : depthRenderBuffer, t : fTexture};
	}
};





// // sample_077
// //
// // GLSL プロシージャルノイズ

// // GLSL サンプルの(ほぼ)共通仕様 =============================================
// // 
// // ・シェーダのコンパイルに失敗した場合は auto run を無効にします
// // ・auto run は 30fps になっているので環境と負荷に応じて適宜変更しましょう
// // ・uniform 変数は以下のようにシェーダへ送られます 
// //     ・time: 経過時間を秒単位(ミリ秒は小数点以下)で送る(float)
// //     ・mouse: マウス座標を canvas 左上原点で 0 ～ 1 の範囲で送る(vec2)
// //     ・resolution: スクリーンの縦横の幅をピクセル単位で送る(vec2)
// // ・シェーダのコンパイルに失敗した場合エラー内容をアラートとコンソールに出力
// // ・シェーダのエラーで表示される行番号は一致するように HTML を書いてあります
// // 
// // ============================================================================

// // global
// var c, cw, ch, mx, my, gl, run, eCheck;
// var startTime;
// var time = 0.0;
// var tempTime = 0.0;
// var fps = 1000 / 30;
// var uniLocation = new Array();

// // onload
// window.onload = function(){
// 	// canvas エレメントを取得
// 	c = document.getElementById('canvas');
	
// 	// canvas サイズ
// 	cw = 512; ch = 512;
// 	c.width = cw; c.height = ch;
	
// 	// エレメントを取得
// 	eCheck = document.getElementById('check');
	
// 	// イベントリスナー登録
// 	c.addEventListener('mousemove', mouseMove, true);
// 	eCheck.addEventListener('change', checkChange, true);
	
// 	// WebGL コンテキストを取得
// 	gl = c.getContext('webgl') || c.getContext('experimental-webgl');
	
// 	// シェーダ周りの初期化
// 	var prg = create_program(create_shader('vs'), create_shader('fs'));
// 	run = (prg != null); if(!run){eCheck.checked = false;}
// 	uniLocation[0] = gl.getUniformLocation(prg, 'time');
// 	uniLocation[1] = gl.getUniformLocation(prg, 'mouse');
// 	uniLocation[2] = gl.getUniformLocation(prg, 'resolution');
	
// 	// 頂点データ回りの初期化
// 	var position = [
// 		-1.0,  1.0,  0.0,
// 		 1.0,  1.0,  0.0,
// 		-1.0, -1.0,  0.0,
// 		 1.0, -1.0,  0.0
// 	];
// 	var index = [
// 		0, 2, 1,
// 		1, 2, 3
// 	];
// 	var vPosition = create_vbo(position);
// 	var vIndex = create_ibo(index);
// 	var vAttLocation = gl.getAttribLocation(prg, 'position');
// 	gl.bindBuffer(gl.ARRAY_BUFFER, vPosition);
// 	gl.enableVertexAttribArray(vAttLocation);
// 	gl.vertexAttribPointer(vAttLocation, 3, gl.FLOAT, false, 0, 0);
// 	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vIndex);
	
// 	// その他の初期化
// 	gl.clearColor(0.0, 0.0, 0.0, 1.0);
// 	mx = 0.5; my = 0.5;
// 	startTime = new Date().getTime();
	
// 	// レンダリング関数呼出
// 	render();
// };

// // checkbox
// function checkChange(e){
// 	run = e.currentTarget.checked;
// 	if(run){
// 		startTime = new Date().getTime();
// 		render();
// 	}else{
// 		tempTime += time;
// 	}
// }

// // mouse
// function mouseMove(e){
// 	mx = e.offsetX / cw;
// 	my = e.offsetY / ch;
// }

// // レンダリングを行う関数
// function render(){
// 	// フラグチェック
// 	if(!run){return;}
	
// 	// 時間管理
// 	time = (new Date().getTime() - startTime) * 0.001;
	
// 	// カラーバッファをクリア
// 	gl.clear(gl.COLOR_BUFFER_BIT);
	
// 	// uniform 関連
// 	gl.uniform1f(uniLocation[0], time + tempTime);
// 	gl.uniform2fv(uniLocation[1], [mx, my]);
// 	gl.uniform2fv(uniLocation[2], [cw, ch]);
	
// 	// 描画
// 	gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
// 	gl.flush();
	
// 	// 再帰
// 	setTimeout(render, fps);
// }

// // シェーダを生成する関数
// function create_shader(id){
// 	// シェーダを格納する変数
// 	var shader;
	
// 	// HTMLからscriptタグへの参照を取得
// 	var scriptElement = document.getElementById(id);
	
// 	// scriptタグが存在しない場合は抜ける
// 	if(!scriptElement){return;}
	
// 	// scriptタグのtype属性をチェック
// 	switch(scriptElement.type){
		
// 		// 頂点シェーダの場合
// 		case 'x-shader/x-vertex':
// 			shader = gl.createShader(gl.VERTEX_SHADER);
// 			break;
			
// 		// フラグメントシェーダの場合
// 		case 'x-shader/x-fragment':
// 			shader = gl.createShader(gl.FRAGMENT_SHADER);
// 			break;
// 		default :
// 			return;
// 	}
	
// 	// 生成されたシェーダにソースを割り当てる
// 	gl.shaderSource(shader, scriptElement.text);
	
// 	// シェーダをコンパイルする
// 	gl.compileShader(shader);
	
// 	// シェーダが正しくコンパイルされたかチェック
// 	if(gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
		
// 		// 成功していたらシェーダを返して終了
// 		return shader;
// 	}else{
		
// 		// 失敗していたらエラーログをアラートしコンソールに出力
// 		alert(gl.getShaderInfoLog(shader));
// 		console.log(gl.getShaderInfoLog(shader));
// 	}
// }

// // プログラムオブジェクトを生成しシェーダをリンクする関数
// function create_program(vs, fs){
// 	// プログラムオブジェクトの生成
// 	var program = gl.createProgram();
	
// 	// プログラムオブジェクトにシェーダを割り当てる
// 	gl.attachShader(program, vs);
// 	gl.attachShader(program, fs);
	
// 	// シェーダをリンク
// 	gl.linkProgram(program);
	
// 	// シェーダのリンクが正しく行なわれたかチェック
// 	if(gl.getProgramParameter(program, gl.LINK_STATUS)){
	
// 		// 成功していたらプログラムオブジェクトを有効にする
// 		gl.useProgram(program);
		
// 		// プログラムオブジェクトを返して終了
// 		return program;
// 	}else{
		
// 		// 失敗していたら NULL を返す
// 		return null;
// 	}
// }

// // VBOを生成する関数
// function create_vbo(data){
// 	// バッファオブジェクトの生成
// 	var vbo = gl.createBuffer();
	
// 	// バッファをバインドする
// 	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	
// 	// バッファにデータをセット
// 	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
	
// 	// バッファのバインドを無効化
// 	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	
// 	// 生成した VBO を返して終了
// 	return vbo;
// }

// // IBOを生成する関数
// function create_ibo(data){
// 	// バッファオブジェクトの生成
// 	var ibo = gl.createBuffer();
	
// 	// バッファをバインドする
// 	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
	
// 	// バッファにデータをセット
// 	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);
	
// 	// バッファのバインドを無効化
// 	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	
// 	// 生成したIBOを返して終了
// 	return ibo;
// }
