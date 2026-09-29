(function(root){
    'use strict';
    root.validateProfileFields = function(prefix) {
        const field=name=>document.getElementById(`${prefix}-${name}`);
        const value=name=>Number(field(name)?.value);
        const ranges={age:[1,120],height:[50,250],'work-days':[0,365],'rest-days':[0,365]};
        if(prefix==='reg')ranges.weight=[1,500];
        for(const[name,[min,max]]of Object.entries(ranges)){
            const n=value(name);
            if(!field(name)?.value.trim()||!Number.isFinite(n)||n<min||n>max||(['age','work-days','rest-days'].includes(name)&&!Number.isInteger(n))){
                alert('Перевір вік, зріст, вагу та кількість днів графіка. Значення мають бути в допустимих межах.');field(name)?.focus();return false;
            }
        }
        if(value('work-days')+value('rest-days')===0){alert('У графіку має бути хоча б один день.');return false;}
        const options={gender:['male','female'],goal:['lose','maintain','gain'],diet:['standard','balanced','lowcarb','keto'],'app-mode':['simple','pro'],'activity-work':['1.2','1.375','1.55','1.725','1.9'],'activity-rest':['1.2','1.375','1.55']};
        for(const[name,allowed]of Object.entries(options))if(!allowed.includes(field(name)?.value)){alert('Обери всі параметри профілю.');field(name)?.focus();return false;}
        return true;
    };
})(window);
