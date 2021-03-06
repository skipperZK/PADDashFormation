﻿const fs = require('fs');
const Card = require('./official-API/parseCard');
const Skill = require('./official-API/parseSkill');
var officialAPI = [ //来源于官方API
	{
		code:"ja",
		customName:["cht","chs"]
	},
	{
		code:"en",
		customName:[]
	},
	{
		code:"ko",
		customName:[]
	}
];

//比较两只怪物是否是同一只（在不同语言服务器）
function sameCard(m1,m2)
{
	if (m1 == undefined || m2 == undefined) return false; //是否存在
	if (m1.attrs[0] != m2.attrs[0]) return false; //主属性
	if (m1.attrs[1] != m2.attrs[1]) return false; //副属性
	if (m1.types.length != m2.types.length) return false; //类型长度
	if (m1.types.some(function(t1,ti){
		return m2.types[ti] == undefined || m2.types[ti] != t1;
	})) return false; //全部类型有任意不同的时候也返回false
	if (m1.maxLevel != m2.maxLevel) return false; //最大等级
	if (m1.collabId != m2.collabId) return false; //合作ID
	return true;
}
/*
 * 正式流程
 */
officialAPI.forEach(function(lang){
	console.log("正在读取官方 " + lang.code + " 信息");
	const cardJson = fs.readFileSync("official-API/" + lang.code +".json", 'utf-8'); //使用同步读取怪物
	const oCards = lang.cardOriginal = JSON.parse(cardJson).card;//将字符串转换为json对象

	let maxCardIndex = 0;
	while (oCards[maxCardIndex][0] == maxCardIndex)
	{
		maxCardIndex++;
	}
	const monCards = lang.cards = oCards
		.slice(0,maxCardIndex)  //切出前面id相等部分(id不等于索引时，都是敌人)
		.map((oc)=>{return new Card(oc);}); //每一项生成分析对象

	//加入自定义的语言
	lang.customName.forEach(function(lcode){
		console.log("正在读取自定义 " + lcode + " 信息");
		const ljson = fs.readFileSync("custom/" + lcode +".json", 'utf-8'); //使用同步读取
		const ccard = JSON.parse(ljson);//将字符串转换为json对象
		ccard.forEach(function(cm,idx){ //每个文件内的名字循环
			let m = monCards[cm.id];
			if (m)
			{
				if (!m.otLangName) //如果没有其他语言名称属性，则添加一个对象属性
					m.otLangName = {};
				m.otLangName[lcode] = cm.name;
			}
		});
	});

	const skillJson = fs.readFileSync("official-API/" + lang.code +"-skill.json", 'utf-8'); //使用同步读取技能
	const oSkills = lang.skillOriginal = JSON.parse(skillJson).skill;//将字符串转换为json对象
	lang.skills = oSkills.map((oc,idx)=>{return new Skill(idx,oc);}); //每一项生成分析对象
});

//加入其他服务器相同角色的名字
for (let li = 0;li < officialAPI.length; li++)
{
	const otherLangs = officialAPI.concat(); //复制一份原始数组，储存其他语言
	const lang = otherLangs.splice(li,1)[0]; //删掉并取得当前的语言

	const langCard = lang.cards;
	const langCardCount = langCard.length;
	for (let mi=0; mi<langCardCount; mi++)
	{
		const m = langCard[mi];
		const name = m.name; //当前语言的名字

		//名字对象
		otherLangs.forEach((otLang)=>{
			let _m = otLang.cards[mi]; //获得这种其他语言的当前这个怪物数据
			let isSame = sameCard(m,_m); //与原语言怪物是否是同一只
			const l1 = lang.code, l2 = otLang.code;
			if (!isSame &&
				(
					l1 == 'ja' && (l2 == 'en' || l2 == 'ko') ||
					l2 == 'ja' && (l1 == 'en' || l1 == 'ko')
				) //当同id两者不同，日服和英韩服比较时的一些人工确认相同的特殊id差异卡片
			)
			{
				const langIsJa = l1 == 'ja' ? true : false; //原始语言是否是日语
				let diff = 0; //日语和其它语言的id差异
				switch(true)
				{
					case (langIsJa && mi>=671 && mi<= 680) ||
						 (!langIsJa && mi>=1049 && mi<= 1058):
						//神罗 日服 671-680 等于英韩服 1049-1058
						diff = 378;
						break;
					case (langIsJa && mi>=669 && mi<= 670) ||
						 (!langIsJa && mi>=934 && mi<= 935):
						//神罗 日服 669-670 等于英韩服 934-935
						diff = 265;
						break;
					case (langIsJa && mi>=924 && mi<= 935) ||
						 (!langIsJa && mi>=669 && mi<= 680):
						//蝙蝠侠 日服 924-935 等于英韩服 669-680
						diff = -255;
						break;
					case (langIsJa && mi>=1049 && mi<= 1058) ||
						 (!langIsJa && mi>=924 && mi<= 933):
						//蝙蝠侠 日服 1049-1058 等于英韩服 924-933
						diff = -125;
						break;
				}
				if (diff != 0)
				{
					_m = langIsJa ? otLang.cards[mi + diff] : otLang.cards[mi - diff];
					isSame = true;
				}
			}
			if (_m && isSame) //如果有这个怪物，且与原语言怪物是同一只
			{
				const otName = _m.name;
				if (!/^\*+/.test(name) && //名字不是星号开头
					!/^\*+/.test(otName) && //另一个语言名字不是星号开头
					!/^\?+/.test(name) && //名字不是问号开头
					!/^\?+/.test(otName) && //另一个语言名字不是问号开头
					!/^초월\s*\?+/.test(name) && //名字不是韩文的问号开头
					!/^초월\s*\?+/.test(otName) //另一个语言名字不是韩文的问号开头
				) //以上情况全符合才添加
				{
					if (!m.otLangName) //如果没有其他语言名称属性，则添加一个对象属性
						m.otLangName = {};
					m.otLangName[otLang.code] = otName;
					if (_m.otLangName)
						m.otLangName = Object.assign(m.otLangName, _m.otLangName); //增加储存当前语言的全部其他语言
				}
			}
		});
	}
}

//最后批量保存
officialAPI.forEach(function(lang){
	let lcode = lang.code;
/*	//删除暂时无用的内容
	lang.cards.forEach((card)=>{
		delete card.enemy;
	});
*/
	const cardStr = JSON.stringify(lang.cards);
	fs.writeFile('./mon_'+lcode+'.json',cardStr,function(err){
		if(err){
			console.error(err);
		}
		console.log('mon_'+lcode+'.json 导出成功');
	});
	const skillStr = JSON.stringify(lang.skills);
	fs.writeFile('./skill_'+lcode+'.json',skillStr,function(err){
		if(err){
			console.error(err);
		}
		console.log('skill_'+lcode+'.json 导出成功');
	});
});